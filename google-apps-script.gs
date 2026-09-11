const REMINDER_PROPERTY_PREFIX = 'seminarReminder_';
const SPREADSHEET_ID = '1U9uXXvZ4_m5_peUSgKXu-KIPLWCnUXFFHv6u2TdBbdQ';
const SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    const params = e.parameter || {};
    const email = String(params.email || '').trim();
    const fullName = String(params.fullName || 'Participant').trim();
    const fatherName = String(params.fatherName || '').trim();
    const phone = String(params.phone || '').trim();
    const currentClass = String(params.currentClass || '').trim();
    const class10Percentage = String(params.class10Percentage || '').trim();
    const exam = String(params.exam || '').trim();
    const selectedDate = String(params.selectedDate || '').trim();
    const eventDateTime = String(params.eventDateTime || '').trim();
    const reminderDateTime = String(params.reminderDateTime || '').trim();

    if (!email || !eventDateTime || !reminderDateTime) {
      return jsonResponse({
        success: false,
        error: 'email, eventDateTime and reminderDateTime are required.'
      });
    }

    const reminderAt = new Date(reminderDateTime);
    const eventAt = new Date(eventDateTime);

    if (Number.isNaN(reminderAt.getTime()) || Number.isNaN(eventAt.getTime())) {
      return jsonResponse({ success: false, error: 'Invalid date format.' });
    }

    if (reminderAt.getTime() <= Date.now()) {
      return jsonResponse({ success: false, error: 'Reminder time must be in the future.' });
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];

    if (!sheet) {
      return jsonResponse({ success: false, error: 'No sheet tab was found.' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, '');
    const existingRows = sheet.getDataRange().getValues();
    const duplicateFound = existingRows.slice(1).some((row) => {
      const existingEmail = String(row[3] || '').trim().toLowerCase();
      const existingPhone = String(row[4] || '').replace(/\D/g, '');
      return (normalizedEmail && existingEmail === normalizedEmail) ||
        (normalizedPhone && existingPhone === normalizedPhone);
    });

    if (duplicateFound) {
      return jsonResponse({
        success: false,
        error: 'User already exists with this email or phone number.'
      });
    }

    sheet.appendRow([
      new Date(),
      fullName,
      fatherName,
      email,
      phone,
      currentClass,
      class10Percentage,
      exam,
      selectedDate
    ]);

    const formattedEventDate = Utilities.formatDate(
      eventAt,
      Session.getScriptTimeZone() || 'Asia/Kolkata',
      'EEE, d MMM yyyy, h:mm a'
    );

    MailApp.sendEmail({
      to: email,
      subject: 'Registration confirmed: Your seminar booking',
      body: `Hi ${fullName},\n\nYour seminar registration is confirmed for ${formattedEventDate} IST.\n\nYou will receive another reminder 20 minutes before the seminar.\n\nSee you there!`,
      htmlBody: `<p>Hi ${escapeHtml(fullName)},</p><p>Your seminar registration is <strong>confirmed</strong> for <strong>${formattedEventDate} IST</strong>.</p><p>You will receive another reminder 20 minutes before the seminar.</p><p>See you there!</p>`
    });

    const reminderId = Utilities.getUuid();
    const reminder = {
      email: email,
      fullName: fullName,
      eventAt: eventAt.toISOString(),
      reminderAt: reminderAt.toISOString(),
      reminderId: reminderId
    };

    const trigger = ScriptApp
      .newTrigger('sendSeminarReminder')
      .timeBased()
      .at(reminderAt)
      .create();

    PropertiesService
      .getScriptProperties()
      .setProperty(REMINDER_PROPERTY_PREFIX + trigger.getUniqueId(), JSON.stringify(reminder));

    return jsonResponse({
      success: true,
      message: 'Registration saved and reminder scheduled.'
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, error: String(error.message || error) });
  }
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || '').replace(/[^a-zA-Z0-9_$]/g, '');

  if (params.action === 'check') {
    const email = String(params.email || '').trim().toLowerCase();
    const phone = String(params.phone || '').replace(/\D/g, '');
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const rows = sheet ? sheet.getDataRange().getValues().slice(1) : [];
    const exists = rows.some((row) => {
      const existingEmail = String(row[3] || '').trim().toLowerCase();
      const existingPhone = String(row[4] || '').replace(/\D/g, '');
      return (email && existingEmail === email) || (phone && existingPhone === phone);
    });
    const response = JSON.stringify({ exists: exists });

    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${response});`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return jsonResponse({ exists: exists });
  }

  return jsonResponse({ success: true, message: 'Seminar backend is running.' });
}

function sendSeminarReminder(event) {
  const triggerId = event && event.triggerUid;
  if (!triggerId) {
    return;
  }

  const properties = PropertiesService.getScriptProperties();
  const propertyKey = REMINDER_PROPERTY_PREFIX + triggerId;
  const reminderJson = properties.getProperty(propertyKey);

  if (!reminderJson) {
    removeTrigger(triggerId);
    return;
  }

  const reminder = JSON.parse(reminderJson);
  const eventDate = new Date(reminder.eventAt);
  const formattedEventDate = Utilities.formatDate(
    eventDate,
    Session.getScriptTimeZone() || 'Asia/Kolkata',
    'EEE, d MMM yyyy, h:mm a'
  );

  MailApp.sendEmail({
    to: reminder.email,
    subject: 'Reminder: Your seminar starts in 20 minutes',
    body: `Hi ${reminder.fullName},\n\nYour seminar starts in 20 minutes at ${formattedEventDate} IST.\n\nSee you there!`,
    htmlBody: `<p>Hi ${escapeHtml(reminder.fullName)},</p><p>Your seminar starts in <strong>20 minutes</strong> at <strong>${formattedEventDate} IST</strong>.</p><p>See you there!</p>`
  });

  properties.deleteProperty(propertyKey);
  removeTrigger(triggerId);
}

function removeTrigger(triggerId) {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
