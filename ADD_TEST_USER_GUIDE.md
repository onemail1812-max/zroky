# Add Yourself as Test User - Step-by-Step Guide

## 🎯 Goal
Add your Gmail account as a test user so you can bypass the "Google hasn't verified this app" warning.

---

## 📋 Step-by-Step Instructions

### Step 1: Open Google Cloud Console
1. Open your browser
2. Go to: https://console.cloud.google.com/
3. Sign in with your Google account (if not already signed in)

### Step 2: Select Your Project
1. At the top of the page, click the **project dropdown** (next to "Google Cloud")
2. Select your project (likely named something like "ZROKY-Production" or the name you used)
3. If you don't see your project, search for it in the search box

### Step 3: Navigate to OAuth Consent Screen
1. In the left sidebar, click **"APIs & Services"**
2. Click **"OAuth consent screen"**
   - OR use this direct link: https://console.cloud.google.com/apis/credentials/consent

### Step 4: Add Test Users
1. Scroll down to the **"Test users"** section
2. Click the **"+ ADD USERS"** button
3. In the popup, enter your Gmail address
   - Example: `yourname@gmail.com`
   - You can add multiple emails (comma-separated)
4. Click **"SAVE"**

### Step 5: Verify Test User Added
1. You should see your email listed under "Test users"
2. The status should show as "Added"

### Step 6: Save Changes
1. Scroll to the bottom of the page
2. Click **"SAVE AND CONTINUE"** (if available)
3. Or just ensure your changes are saved

---

## ✅ What Happens Next

After adding yourself as a test user:

1. **You can still see the warning** - "Google hasn't verified this app"
2. **BUT you can click through it** - Click "Advanced" → "Go to [App Name] (unsafe)"
3. **Grant permissions** - Allow access to Gmail and Calendar
4. **You'll be redirected back** - To your app with a valid OAuth token
5. **It will work!** - Your app can now access Gmail and Calendar

---

## 🔍 Visual Guide

### What You're Looking For:

```
OAuth consent screen
├── App information
│   ├── App name: ZROKY
│   ├── User support email: your-email@gmail.com
│   └── ...
├── Scopes
│   ├── .../auth/gmail.readonly
│   ├── .../auth/gmail.modify
│   └── .../auth/calendar.readonly
└── Test users ← YOU'RE HERE
    ├── + ADD USERS ← CLICK THIS
    └── List of test users:
        └── yourname@gmail.com ✓
```

---

## 🎯 Quick Checklist

- [ ] Opened Google Cloud Console
- [ ] Selected correct project
- [ ] Navigated to OAuth consent screen
- [ ] Clicked "+ ADD USERS" in Test users section
- [ ] Entered your Gmail address
- [ ] Clicked "SAVE"
- [ ] Verified your email appears in the list

---

## 🚀 After Adding Test User

### Test the OAuth Flow Again:

1. Go back to your app: http://localhost:3003/chief-of-staff
2. Click "Connect" on Gmail card
3. You'll see the warning: "Google hasn't verified this app"
4. Click **"Advanced"** (bottom left)
5. Click **"Go to ZROKY (unsafe)"**
6. Grant permissions
7. ✅ Success! You'll be redirected back

---

## ⚠️ Important Notes

### During Testing Phase:
- ✅ You can add up to **100 test users**
- ✅ Test users can use the app without verification
- ✅ The warning will still appear but you can bypass it
- ⚠️ Only test users can access the app

### For Production:
- You'll need to **publish the app** and get it verified by Google
- This removes the warning for ALL users
- Verification process takes 1-6 weeks
- Required for public/production use

---

## 🆘 Troubleshooting

### "I don't see the Test users section"
- Make sure you're on the **OAuth consent screen** page
- Scroll down - it's below the Scopes section
- Your app must be in "Testing" mode (not "In production")

### "I can't add users"
- Check if you have the right permissions in Google Cloud
- You need to be an Owner or Editor of the project

### "The warning still appears"
- This is normal! Test users still see the warning
- Just click "Advanced" → "Go to [App Name] (unsafe)"
- This is expected behavior for unverified apps

---

## 📧 Which Email to Add?

Add the Gmail account you want to use for testing:
- If testing with your personal Gmail: `yourname@gmail.com`
- If testing with work email: `yourname@company.com`
- You can add multiple emails for team testing

---

## ✅ Success Criteria

You'll know it worked when:
1. Your email appears in the Test users list
2. You can click through the OAuth warning
3. You successfully grant permissions
4. You're redirected back to your app
5. Gmail card shows "Connected" status
6. Morning Greeting displays your real emails

---

**Ready to test? Follow the steps above and let me know if you need any help!** 🚀
