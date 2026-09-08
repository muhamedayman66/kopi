// ==========================================================
// KOPI API - Google Apps Script Backend
// ==========================================================

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}

  var SPREADSHEET_ID = ""; 
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  throw new Error("لم يتم العثور على جوجل شيت المرتبط. يرجى فتح Apps Script من داخل الشيت نفسه (Extensions -> Apps Script)");
}

function getOrCreateSheet(ss, name, headers) {
  var sheets = ss.getSheets();
  
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().trim();
    if (sName.indexOf(name) !== -1 || name.indexOf(sName) !== -1) {
      return sheets[i];
    }
  }

  var newSheet = ss.insertSheet(name);
  if (headers && headers.length > 0) {
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    newSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return newSheet;
}

function doGet(e) {
  return handleRequest(function() {
    var ss = getSpreadsheet();

    var sheetContrib = getOrCreateSheet(ss, "المساهمات", ["م", "التاريخ", "اسم الشريك", "المبلغ", "طريقة الدفع", "ملاحظات"]);
    var sheetExpense = getOrCreateSheet(ss, "المصروفات", ["م", "التاريخ", "البند", "المبلغ", "اتصرف من فلوس", "ملاحظات"]);
    var sheetCustody = getOrCreateSheet(ss, "عهدة", ["م", "التاريخ", "الشريك الماسك", "المبلغ", "السبب", "الحالة", "ملاحظات"]);

    var contributions = readSheetData(sheetContrib, function(row, index) {
      return {
        _row: index + 2,
        id: row[0] || index + 1,
        date: formatDate(row[1]),
        partner: String(row[2] || '').trim(),
        amount: Number(row[3]) || 0,
        method: String(row[4] || '').trim(),
        notes: String(row[5] || '').trim()
      };
    });

    var expenses = readSheetData(sheetExpense, function(row, index) {
      return {
        _row: index + 2,
        id: row[0] || index + 1,
        date: formatDate(row[1]),
        item: String(row[2] || '').trim(),
        amount: Number(row[3]) || 0,
        paidFrom: String(row[4] || '').trim(),
        notes: String(row[5] || '').trim()
      };
    });

    var custody = readSheetData(sheetCustody, function(row, index) {
      return {
        _row: index + 2,
        id: row[0] || index + 1,
        date: formatDate(row[1]),
        partner: String(row[2] || '').trim(),
        amount: Number(row[3]) || 0,
        reason: String(row[4] || '').trim(),
        status: String(row[5] || '').trim(),
        notes: String(row[6] || '').trim()
      };
    });

    // استخراج قائمة الشركاء الفريدة
    var partnerSet = {};
    contributions.forEach(function(c) { if (c.partner) partnerSet[c.partner] = true; });
    custody.forEach(function(c) { if (c.partner) partnerSet[c.partner] = true; });
    var partnerList = Object.keys(partnerSet);
    if (partnerList.length === 0) partnerList = ["شريك 1", "شريك 2"];

    // حساب الإحصائيات العامة
    var totalContrib = contributions.reduce(function(acc, item) { return acc + item.amount; }, 0);
    var totalExp = expenses.reduce(function(acc, item) { return acc + item.amount; }, 0);
    var custodyHeld = custody.reduce(function(acc, item) { 
      var st = (item.status || '').toLowerCase();
      var isHeld = st.indexOf('لا') !== -1 || st.indexOf('معاه') !== -1 || st.indexOf('لم') !== -1;
      return isHeld ? acc + item.amount : acc; 
    }, 0);
    var available = totalContrib - totalExp;

    // مجموع ما دفعه الشركاء المحددون فقط
    var sumPartnerPaid = 0;
    var partnerPaidMap = {};
    partnerList.forEach(function(pName) {
      var pContrib = contributions.filter(function(c) { return c.partner === pName; })
                                  .reduce(function(acc, c) { return acc + c.amount; }, 0);
      partnerPaidMap[pName] = pContrib;
      sumPartnerPaid += pContrib;
    });

    // حساب حصة الشركاء بناءً على مجموع مدفوعات الشركاء الفعلية
    var partnersSummary = partnerList.map(function(pName) {
      var pContrib = partnerPaidMap[pName] || 0;
      var sharePct = sumPartnerPaid > 0 ? (pContrib / sumPartnerPaid) : (1 / partnerList.length);
      var shareExp = totalExp * sharePct;
      var balance = pContrib - shareExp;

      return {
        name: pName,
        totalPaid: pContrib,
        sharePercent: sharePct,
        shareOfExpenses: shareExp,
        balance: balance
      };
    });

    partnersSummary.push({
      name: "الإجمالي",
      totalPaid: sumPartnerPaid,
      sharePercent: 1,
      shareOfExpenses: totalExp,
      balance: sumPartnerPaid - totalExp
    });

    return {
      contributions: contributions,
      expenses: expenses,
      custody: custody,
      summary: {
        totals: {
          totalContributions: totalContrib,
          totalExpenses: totalExp,
          custodyStillHeld: custodyHeld,
          availableBalance: available
        },
        partners: partnersSummary
      },
      lists: {
        partners: partnerList,
        paymentMethods: ["كاش", "تحويل بانكي", "فودافون كاش", "إنستا باي"],
        expensePaidFrom: ["الخزنة / الصندوق", "عهدة مع شريك"].concat(partnerList),
        custodyStatus: ["لا - لسه معاه", "نعم - اتصرفت/اتوردت"]
      }
    };
  });
}

function doPost(e) {
  return handleRequest(function() {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var sheetKey = contents.sheet;
    var data = contents.data;
    var row = contents.row;

    var ss = getSpreadsheet();
    var sheetNameMap = {
      contributions: "المساهمات",
      expenses: "المصروفات",
      custody: "عهدة"
    };

    var sheetName = sheetNameMap[sheetKey];
    if (!sheetName) throw new Error("اسم التبويب غير معروف: " + sheetKey);

    var sheet = getOrCreateSheet(ss, sheetName);

    if (action === "add") {
      var nextId = sheet.getLastRow();
      var rowData = [];
      if (sheetKey === "contributions") {
        rowData = [nextId, data.date, data.partner, data.amount, data.method, data.notes || ""];
      } else if (sheetKey === "expenses") {
        rowData = [nextId, data.date, data.item, data.amount, data.paidFrom, data.notes || ""];
      } else if (sheetKey === "custody") {
        rowData = [nextId, data.date, data.partner, data.amount, data.reason, data.status, data.notes || ""];
      }
      sheet.appendRow(rowData);
      return { success: true };

    } else if (action === "update") {
      if (!row || row < 2) throw new Error("رقم الصف غير صحيح للتعديل");
      if (sheetKey === "contributions") {
        sheet.getRange(row, 2, 1, 5).setValues([[data.date, data.partner, data.amount, data.method, data.notes || ""]]);
      } else if (sheetKey === "expenses") {
        sheet.getRange(row, 2, 1, 5).setValues([[data.date, data.item, data.amount, data.paidFrom, data.notes || ""]]);
      } else if (sheetKey === "custody") {
        sheet.getRange(row, 2, 1, 6).setValues([[data.date, data.partner, data.amount, data.reason, data.status, data.notes || ""]]);
      }
      return { success: true };

    } else if (action === "delete") {
      if (!row || row < 2) throw new Error("رقم الصف غير صحيح للحذف");
      var numCols = sheet.getLastColumn() || 6;
      var emptyValues = [];
      for (var i = 0; i < numCols; i++) emptyValues.push("");
      sheet.getRange(row, 1, 1, numCols).setValues([emptyValues]);
      return { success: true };

    } else {
      throw new Error("الأمر غير معروف: " + action);
    }
  });
}

function readSheetData(sheet, mapFn) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var result = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var isEmpty = r.every(function(cell) { return cell === "" || cell === null || cell === undefined; });
    if (!isEmpty) {
      result.push(mapFn(r, i));
    }
  }
  return result;
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val);
}

function handleRequest(fn) {
  try {
    var data = fn();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
