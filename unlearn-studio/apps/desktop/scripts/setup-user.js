#!/usr/bin/env node
// Run with: node setup-user.js
// Sets up harshdevsingh2004@gmail.com with a permanent business plan
// Uses Firebase Admin SDK

const admin = require("firebase-admin");

// Initialize with service account (download from Firebase Console)
// If no service account, we'll use the web API approach
const serviceAccount = null; // Set this if you have it

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Use default credentials or project
  admin.initializeApp({
    projectId: "remapstudios-5b9b0",
  });
}

const db = admin.firestore();

async function setupUser() {
  // Find user by email
  const usersRef = db.collection("users");
  const snapshot = await usersRef.where("email", "==", "harshdevsingh2004@gmail.com").get();

  if (snapshot.empty) {
    // User doesn't exist yet — create placeholder document
    // They'll be created properly when they first sign up
    console.log("User not found yet. Creating placeholder document...");

    // We can't create without a UID, so let's create a config document
    // that the app will check
    await db.collection("config").doc("permanent_plans").set({
      emails: ["harshdevsingh2004@gmail.com"],
      plan: "business",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Created config/permanent_plans document.");
    console.log("When harshdevsingh2004@gmail.com signs up, the app will auto-upgrade them.");
  } else {
    // User exists — update their plan
    for (const doc of snapshot.docs) {
      await doc.ref.update({
        plan: "business",
        planStatus: "active",
        trialEndsAt: null,
        modelsLimit: 999,
        stepsLimit: 10000,
        updatedAt: Date.now(),
      });
      console.log(`Updated ${doc.id} (${doc.data().email}) to business plan.`);
    }
  }
}

setupUser()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
