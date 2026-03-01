from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///:memory:")
with engine.connect() as conn:
    conn.execute(text("CREATE TABLE test (metadata_json JSON)"))
    conn.execute(text("INSERT INTO test VALUES ('{\"foo\": \"bar\"}')"))
    
    # Test parameterized ->>
    res = conn.execute(text("SELECT * FROM test WHERE metadata_json->>:k = :v"), {"k": "foo", "v": "bar"}).fetchall()
    print("Parameter binding ->> success. Matches:", len(res))
