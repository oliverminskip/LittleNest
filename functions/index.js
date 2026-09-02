const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

const TYPE_LABELS = {
  meal: { icon: "🍽️", label: "Meal" },
  nap: { icon: "😴", label: "Nap" },
  nappy: { icon: "🧷", label: "Nappy" },
  bottle: { icon: "🍼", label: "Bottle" },
  activity: { icon: "🧩", label: "Activity" },
  mood: { icon: "😊", label: "Mood" },
  note: { icon: "📝", label: "Note" },
  accident: { icon: "🚑", label: "Accident" },
  incident: { icon: "⚠️", label: "Incident" },
  medication: { icon: "💊", label: "Medication" },
};
const URGENT_TITLES = {
  accident: "🚑 Accident recorded — please review",
  incident: "⚠️ Incident recorded — please review",
  medication: "💊 Medication given",
};

/** Sends a push to every linked parent's registered devices and prunes tokens FCM reports as dead. */
async function notifyParents(settingId, childId, title, body) {
  const childSnap = await db.doc(`settings/${settingId}/children/${childId}`).get();
  if (!childSnap.exists) return;
  const parentUids = childSnap.data().parentUids || [];
  if (!parentUids.length) return;

  const tokensByUid = {};
  const tokens = [];
  for (const uid of parentUids) {
    const userSnap = await db.doc(`users/${uid}`).get();
    const t = userSnap.exists ? userSnap.data().fcmTokens || [] : [];
    tokensByUid[uid] = t;
    tokens.push(...t);
  }
  if (!tokens.length) return;

  const resp = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { childId, settingId },
    android: { priority: "high" },
  });

  const staleTokens = new Set();
  resp.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error && r.error.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        staleTokens.add(tokens[i]);
      }
    }
  });
  if (staleTokens.size) {
    await Promise.all(
      parentUids.map(async (uid) => {
        const kept = (tokensByUid[uid] || []).filter((t) => !staleTokens.has(t));
        if (kept.length !== (tokensByUid[uid] || []).length) {
          await db.doc(`users/${uid}`).update({ fcmTokens: kept });
        }
      })
    );
  }
}

exports.onEntryCreated = onDocumentCreated(
  "settings/{settingId}/children/{childId}/entries/{entryId}",
  async (event) => {
    const entry = event.data.data();
    const { settingId, childId } = event.params;
    const t = TYPE_LABELS[entry.type] || TYPE_LABELS.note;
    let body = entry.detail || t.label;
    if (entry.startTime && entry.endTime) body = `${t.label} ${entry.startTime}–${entry.endTime}`;
    else if (entry.portion) body = `${t.label} — ate ${String(entry.portion).toLowerCase()}`;
    else if (entry.type === "medication") body = `${entry.medName || "Medication"} — ${entry.medDose || ""}`;
    const title = URGENT_TITLES[entry.type] || `${t.icon} New ${t.label.toLowerCase()} update`;
    await notifyParents(settingId, childId, title, body);
  }
);

exports.onObservationCreated = onDocumentCreated(
  "settings/{settingId}/children/{childId}/observations/{obsId}",
  async (event) => {
    const obs = event.data.data();
    const { settingId, childId } = event.params;
    await notifyParents(settingId, childId, "🌱 New learning moment", obs.title || "A new observation was added");
  }
);
