
import unittest
from unittest.mock import patch
import requests
from requests.adapters import HTTPAdapter
from app.services.integrations.safe_requester import SafeRequester

class TestSafeRequester(unittest.TestCase):
    def test_init_defaults(self):
        client = SafeRequester()
        adapter = client.session.adapters.get("https://")
        self.assertIsInstance(adapter, HTTPAdapter)
        self.assertEqual(adapter.max_retries.total, 3)
        self.assertEqual(adapter.max_retries.status_forcelist, (500, 502, 503, 504, 429))
        self.assertEqual(adapter.max_retries.backoff_factor, 0.5)
        self.assertEqual(client.timeout, 15)

    def test_custom_config(self):
        client = SafeRequester(
            retries=5,
            backoff_factor=1.0,
            status_forcelist=(500,),
            timeout=30
        )
        adapter = client.session.adapters.get("https://")
        self.assertEqual(adapter.max_retries.total, 5)
        self.assertEqual(adapter.max_retries.backoff_factor, 1.0)
        self.assertEqual(adapter.max_retries.status_forcelist, (500,))
        self.assertEqual(client.timeout, 30)

    @patch("requests.Session.get")
    def test_get_call_structure(self, mock_get):
        mock_get.return_value.status_code = 200
        client = SafeRequester()
        
        client.get("http://foo.com", params={"a": 1}, headers={"h": "v"})
        
        mock_get.assert_called_once_with(
            "http://foo.com",
            params={"a": 1},
            headers={"h": "v"},
            timeout=15
        )

    @patch("requests.Session.post")
    def test_post_call_structure(self, mock_post):
        mock_post.return_value.status_code = 201
        client = SafeRequester()
        
        client.post("http://foo.com", json={"foo": "bar"}, timeout=60)
        
        mock_post.assert_called_once_with(
            "http://foo.com",
            data=None,
            json={"foo": "bar"},
            headers=None,
            timeout=60 # Override works
        )

    @patch("requests.Session.get")
    def test_get_raises_on_connection_error(self, mock_get):
        mock_get.side_effect = requests.ConnectionError("Failed")
        client = SafeRequester()
        
        with self.assertRaises(requests.ConnectionError):
            client.get("http://fail.com")

if __name__ == "__main__":
    unittest.main()
