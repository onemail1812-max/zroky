# Week 2: Step-by-Step (GCP Version)

**Status**: Kabhi start karo ready ho?  
**Database**: GCP Cloud SQL PostgreSQL  
**Timeline**: Monday March 4 - Friday March 8  

---

# 🔴 MONDAY - STEP 1️⃣: CREATE GCP DATABASE

## Check 1: Do You Have GCP Access?

```
Before starting, confirm:
☐ GCP Console access: https://console.cloud.google.com
☐ Correct project selected (top left dropdown)
☐ Billing enabled for the project
☐ Cloud SQL Admin API enabled
```

### **Enable Cloud SQL API (if not already enabled)**

Go to: https://console.cloud.google.com/apis/library/sqladmin.googleapis.com

Click: **ENABLE**

Wait: 2-3 minutes for it to turn on

---

## Check 2: GCP Project Details (Before We Begin)

**Send me these details from your GCP console:**

```
Project Name: ___________
Project ID: ___________
Region You Want: us-central1 / us-east1 / asia-southeast1 / ? ___________
```

**I'll wait for this info before sending next commands.**

---

## STEP 1: Open GCP Cloud SQL

1. Go to: https://console.cloud.google.com
2. Search for: **Cloud SQL**
3. Click on **Cloud SQL Instances**
4. Click blue button: **+ CREATE INSTANCE**

---

## STEP 2: Choose PostgreSQL

When you click CREATE INSTANCE:

- Select: **PostgreSQL**
- Click: **CHOOSE THIS ENGINE**

---

## STEP 3: Configure Instance

Fill in these details:

```
Instance ID: aaliyah-db
(Just type this name)

Password: (generate 32-character strong password)
(Save this securely - we'll use it later)

Database version: PostgreSQL 15
(Most recent version)

Region: [Your preferred region from above]

Zonal availability: Single zone
(Change to Multi-zone later if needed, skip for now)

Machine type: Shared core (db-f1-micro)
(Free tier, cheapest option)

Storage type: SSD
Storage capacity: 10 GB

```

---

## STEP 4: Click CREATE

Click the blue **CREATE INSTANCE** button

⏳ **Wait 5-10 minutes** for instance to create

A blue spinning circle will appear. This is normal.

---

## Verification Checkpoint ✅

When it's done:

1. You'll see: ✅ **aaliyah-db** status = AVAILABLE (green checkmark)
2. Note down: Instance connection name (looks like: `project:region:aaliyah-db`)

**Screenshot to send me**: Show the instance status page

---

## ⛔ If Something Goes Wrong

| Problem | Solution |
|---------|----------|
| "Cloud SQL Admin API not enabled" | Enable it from APIs library (link above) |
| "Can't create instance" | Check billing is enabled on project |
| Spinning circle for > 15 min | Refresh page, or try again |

---

**Once STEP 1 is complete, tell me:**
```
✅ Instance created: aaliyah-db
Instance connection name: ________________
```

Then we move to STEP 2: Create database & user

