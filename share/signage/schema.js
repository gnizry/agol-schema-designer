window.SCHEMAS = window.SCHEMAS || {};
window.SCHEMAS["signage"] = {
  "meta": {
    "key": "signage",
    "project": "SignageSurvey",
    "title": "סקר שילוט חדש — קק״ל",
    "version": 20,
    "spatialRef": 2039,
    "spatialRefName": "Israel TM Grid (ITM)",
    "source": "אפיון לוגי סקר ניטור שילוט והמסרה — גרסה 0.2 — 29-10-2026",
    "org": "kkl",
    "rules": {
      "minTextLength": 255,
      "domainCodeEqualsLabel": true
    }
  },
  "domains": {
    "YesNo": {
      "name": "YesNo",
      "desc": "כן / לא",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "כן",
          "label": "כן",
          "parent": ""
        },
        {
          "code": "לא",
          "label": "לא",
          "parent": ""
        }
      ]
    },
    "SignStatus": {
      "name": "SignStatus",
      "desc": "מצב שלט בשטח",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "תקין",
          "label": "תקין",
          "parent": ""
        },
        {
          "code": "לא תקין",
          "label": "לא תקין",
          "parent": ""
        },
        {
          "code": "מתוכנן",
          "label": "מתוכנן",
          "parent": ""
        },
        {
          "code": "לפירוק",
          "label": "לפירוק",
          "parent": ""
        }
      ]
    },
    "SafetyHazard": {
      "name": "SafetyHazard",
      "desc": "סיווג בטיחותי (תחת \"לא תקין\")",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "סכנה בטיחותית",
          "label": "סכנה בטיחותית",
          "parent": ""
        },
        {
          "code": "לא סכנה בטיחותית",
          "label": "לא סכנה בטיחותית",
          "parent": ""
        }
      ]
    },
    "ModelFamily": {
      "name": "ModelFamily",
      "desc": "משפחת דגם שלט (14 משפחות)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "פ-1: שלט כניסה ליער",
          "label": "פ-1: שלט כניסה ליער",
          "parent": "",
          "ext": "P1",
          "img": "media/models/P1.png"
        },
        {
          "code": "פ-2: שלט מבואה",
          "label": "פ-2: שלט מבואה",
          "parent": "",
          "ext": "P2",
          "img": "media/models/P2.png"
        },
        {
          "code": "פ-3: שלט אתר",
          "label": "פ-3: שלט אתר",
          "parent": "",
          "ext": "P3",
          "img": "media/models/P3.2.png"
        },
        {
          "code": "פ-4: שלט מתחלף",
          "label": "פ-4: שלט מתחלף",
          "parent": "",
          "ext": "P4",
          "img": "media/models/P4.1.png"
        },
        {
          "code": "פ-5: שלט מידע",
          "label": "פ-5: שלט מידע",
          "parent": "",
          "ext": "P5",
          "img": "media/models/_family_P5.png"
        },
        {
          "code": "פ-6: שלט הכוונה (כנפיים)",
          "label": "פ-6: שלט הכוונה (כנפיים)",
          "parent": "",
          "ext": "P6",
          "img": "media/models/P6.png"
        },
        {
          "code": "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל",
          "label": "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל",
          "parent": "",
          "ext": "P7",
          "img": "media/models/P7.png"
        },
        {
          "code": "פ-8: שלט הוריה (חיזוק / מידע / הוריה)",
          "label": "פ-8: שלט הוריה (חיזוק / מידע / הוריה)",
          "parent": "",
          "ext": "P8",
          "img": "media/models/P8.png"
        },
        {
          "code": "פ-9: שלט חיזוק בשביל אופניים / הולכי רגל",
          "label": "פ-9: שלט חיזוק בשביל אופניים / הולכי רגל",
          "parent": "",
          "ext": "P9",
          "img": "media/models/P9.png"
        },
        {
          "code": "פ-10: שלט בטיחות (איסור / אזהרה / הנחיה)",
          "label": "פ-10: שלט בטיחות (איסור / אזהרה / הנחיה)",
          "parent": "",
          "ext": "P10",
          "img": "media/models/P10.png"
        },
        {
          "code": "פ-11: שלט תמרור",
          "label": "פ-11: שלט תמרור",
          "parent": "",
          "ext": "P11",
          "img": "media/models/P11.png"
        },
        {
          "code": "פ-12: שלט לוח (ללא רגליים)",
          "label": "פ-12: שלט לוח (ללא רגליים)",
          "parent": "",
          "ext": "P12",
          "img": "media/models/P12.png"
        },
        {
          "code": "פ-13: שלט הוקרה",
          "label": "פ-13: שלט הוקרה",
          "parent": "",
          "ext": "P13",
          "img": "media/models/P13.1.png"
        },
        {
          "code": "פ-14: שלטים מיוחדים",
          "label": "פ-14: שלטים מיוחדים",
          "parent": "",
          "ext": "P14",
          "img": "media/models/P14.3.png"
        }
      ]
    },
    "SignSubModel": {
      "name": "SignSubModel",
      "desc": "דגם / תת דגם שלט (27 אפשרויות; הורה = משפחה; מפתח חיצוני = קוד פ-) img = נתיב יחסי לתיקיית הארגון לתמונת הדגם (טיוטה מעמודי ספר השילוט).",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "פ-1: שלט כניסה ליער",
          "label": "פ-1: שלט כניסה ליער",
          "parent": "פ-1: שלט כניסה ליער",
          "ext": "P1",
          "img": "media/models/P1.png"
        },
        {
          "code": "פ-2: שלט מבואה",
          "label": "פ-2: שלט מבואה",
          "parent": "פ-2: שלט מבואה",
          "ext": "P2",
          "img": "media/models/P2.png"
        },
        {
          "code": "פ-3.1: שלט אתר גדול עם שני נושאים",
          "label": "פ-3.1: שלט אתר גדול עם שני נושאים",
          "parent": "פ-3: שלט אתר",
          "ext": "P3.1",
          "img": "media/models/P3.1.png"
        },
        {
          "code": "פ-3.2: שלט אתר עם נושא אחד",
          "label": "פ-3.2: שלט אתר עם נושא אחד",
          "parent": "פ-3: שלט אתר",
          "ext": "P3.2",
          "img": "media/models/P3.2.png"
        },
        {
          "code": "פ-3.3: שלט אתר עם 3 נושאים",
          "label": "פ-3.3: שלט אתר עם 3 נושאים",
          "parent": "פ-3: שלט אתר",
          "ext": "P3.3",
          "img": "media/models/P3.3.png"
        },
        {
          "code": "פ-3.4: שלט אתר קטן עם 2 נושאים (סינגל / כניסה משנית)",
          "label": "פ-3.4: שלט אתר קטן עם 2 נושאים (סינגל / כניסה משנית)",
          "parent": "פ-3: שלט אתר",
          "ext": "P3.4",
          "img": "media/models/P3.4.png"
        },
        {
          "code": "פ-3.5: שלט אתר יער קהילתי",
          "label": "פ-3.5: שלט אתר יער קהילתי",
          "parent": "פ-3: שלט אתר",
          "ext": "P3.5",
          "img": "media/models/P3.5.png"
        },
        {
          "code": "פ-4.1: שלט מתחלף (באנר)",
          "label": "פ-4.1: שלט מתחלף (באנר)",
          "parent": "פ-4: שלט מתחלף",
          "ext": "P4.1",
          "img": "media/models/P4.1.png"
        },
        {
          "code": "פ-4.1: שלט מתחלף כפול (2 באנרים)",
          "label": "פ-4.1: שלט מתחלף כפול (2 באנרים)",
          "parent": "פ-4: שלט מתחלף",
          "ext": "P4.1-DUP",
          "img": "media/models/P4.1-DUP.png"
        },
        {
          "code": "פ-5.1: שלט מידע גדול / הוראות בטיחות והתנהגות (אנכי)",
          "label": "פ-5.1: שלט מידע גדול / הוראות בטיחות והתנהגות (אנכי)",
          "parent": "פ-5: שלט מידע",
          "ext": "P5.1",
          "img": "media/models/P5.1.png"
        },
        {
          "code": "פ-5.2: שלט מידע שולחני (אלכסוני)",
          "label": "פ-5.2: שלט מידע שולחני (אלכסוני)",
          "parent": "פ-5: שלט מידע",
          "ext": "P5.2",
          "img": "media/models/P5.2.png"
        },
        {
          "code": "פ-5.3: שלט פנורמי / לוח טווחים (אלכסוני שולחן רחב)",
          "label": "פ-5.3: שלט פנורמי / לוח טווחים (אלכסוני שולחן רחב)",
          "parent": "פ-5: שלט מידע",
          "ext": "P5.3",
          "img": "media/models/P5.3.png"
        },
        {
          "code": "פ-5.4: שלט מידע קטן (רגל אחת אלכסוני)",
          "label": "פ-5.4: שלט מידע קטן (רגל אחת אלכסוני)",
          "parent": "פ-5: שלט מידע",
          "ext": "P5.4",
          "img": "media/models/P5.4.png"
        },
        {
          "code": "פ-5.5: שלט מידע קטן (רגל אחת אנחי)",
          "label": "פ-5.5: שלט מידע קטן (רגל אחת אנחי)",
          "parent": "פ-5: שלט מידע",
          "ext": "P5.5",
          "img": "media/models/P5.5.png"
        },
        {
          "code": "פ-5.6: שלט מידע עמודי (אלכסוני)",
          "label": "פ-5.6: שלט מידע עמודי (אלכסוני)",
          "parent": "פ-5: שלט מידע",
          "ext": "P5.6",
          "img": "media/models/P5.6.png"
        },
        {
          "code": "פ-6: שלט הכוונה (כנפיים)",
          "label": "פ-6: שלט הכוונה (כנפיים)",
          "parent": "פ-6: שלט הכוונה (כנפיים)",
          "ext": "P6",
          "img": "media/models/P6.png"
        },
        {
          "code": "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל",
          "label": "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל",
          "parent": "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל",
          "ext": "P7",
          "img": "media/models/P7.png"
        },
        {
          "code": "פ-8: שלט הוריה (חיזוק / מידע / הוריה)",
          "label": "פ-8: שלט הוריה (חיזוק / מידע / הוריה)",
          "parent": "פ-8: שלט הוריה (חיזוק / מידע / הוריה)",
          "ext": "P8",
          "img": "media/models/P8.png"
        },
        {
          "code": "פ-9: שלט חיזוק בשביל אופניים / הולכי רגל (טיפה / הולכי רגל)",
          "label": "פ-9: שלט חיזוק בשביל אופניים / הולכי רגל (טיפה / הולכי רגל)",
          "parent": "פ-9: שלט חיזוק בשביל אופניים / הולכי רגל",
          "ext": "P9",
          "img": "media/models/P9.png"
        },
        {
          "code": "פ-10: שלט בטיחות (איסור / אזהרה / הנחיה)",
          "label": "פ-10: שלט בטיחות (איסור / אזהרה / הנחיה)",
          "parent": "פ-10: שלט בטיחות (איסור / אזהרה / הנחיה)",
          "ext": "P10",
          "img": "media/models/P10.png"
        },
        {
          "code": "פ-11: שלט תמרור על בסיס רשימת התמרורים",
          "label": "פ-11: שלט תמרור על בסיס רשימת התמרורים",
          "parent": "פ-11: שלט תמרור",
          "ext": "P11",
          "img": "media/models/P11.png"
        },
        {
          "code": "פ-12: שלט לוח (ללא רגליים)",
          "label": "פ-12: שלט לוח (ללא רגליים)",
          "parent": "פ-12: שלט לוח (ללא רגליים)",
          "ext": "P12",
          "img": "media/models/P12.png"
        },
        {
          "code": "פ-13.1: שלט הוקרה (2 רגליים)",
          "label": "פ-13.1: שלט הוקרה (2 רגליים)",
          "parent": "פ-13: שלט הוקרה",
          "ext": "P13.1",
          "img": "media/models/P13.1.png"
        },
        {
          "code": "פ-13.2: שלט הוקרה (רגל אחת)",
          "label": "פ-13.2: שלט הוקרה (רגל אחת)",
          "parent": "פ-13: שלט הוקרה",
          "ext": "P13.2",
          "img": "media/models/P13.2.png"
        },
        {
          "code": "פ-14.1: שלט תקינות מתקני משחק ביער (בהנחיית מכון התקנים)",
          "label": "פ-14.1: שלט תקינות מתקני משחק ביער (בהנחיית מכון התקנים)",
          "parent": "פ-14: שלטים מיוחדים",
          "ext": "P14.1",
          "img": "media/models/P14.1.png"
        },
        {
          "code": "פ-14.2: שלט עבודה זמני",
          "label": "פ-14.2: שלט עבודה זמני",
          "parent": "פ-14: שלטים מיוחדים",
          "ext": "P14.2",
          "img": "media/models/P14.2.png"
        },
        {
          "code": "פ-14.3: שלט מתארח",
          "label": "פ-14.3: שלט מתארח",
          "parent": "פ-14: שלטים מיוחדים",
          "ext": "P14.3",
          "img": "media/models/P14.3.png"
        }
      ]
    },
    "TrafficSign": {
      "name": "TrafficSign",
      "desc": "רשימת תמרורים (פ-11)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "עצור",
          "label": "עצור",
          "parent": ""
        },
        {
          "code": "דרך לרכב ולאופניים",
          "label": "דרך לרכב ולאופניים",
          "parent": ""
        },
        {
          "code": "דרך ללא מוצא",
          "label": "דרך ללא מוצא",
          "parent": ""
        },
        {
          "code": "חניית נכים",
          "label": "חניית נכים",
          "parent": ""
        },
        {
          "code": "כניסה אסורה",
          "label": "כניסה אסורה",
          "parent": ""
        },
        {
          "code": "הגבלת מהירות 30",
          "label": "הגבלת מהירות 30",
          "parent": ""
        },
        {
          "code": "איסור כניסה לרכב ואופנוע",
          "label": "איסור כניסה לרכב ואופנוע",
          "parent": ""
        },
        {
          "code": "זהירות — מעבר אופניים",
          "label": "זהירות — מעבר אופניים",
          "parent": ""
        },
        {
          "code": "זהירות — מפגע החלקה",
          "label": "זהירות — מפגע החלקה",
          "parent": ""
        },
        {
          "code": "זהירות — מכשולים בדרך",
          "label": "זהירות — מכשולים בדרך",
          "parent": ""
        },
        {
          "code": "זהירות — פגוש",
          "label": "זהירות — פגוש",
          "parent": ""
        }
      ]
    },
    "Direction": {
      "name": "Direction",
      "desc": "כיוון כנף (פ-6, פ-7) — מפתח חיצוני = קוד הכיוון (מספר)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "צפון",
          "label": "צפון",
          "parent": "",
          "ext": "7"
        },
        {
          "code": "דרום",
          "label": "דרום",
          "parent": "",
          "ext": "3"
        },
        {
          "code": "מזרח",
          "label": "מזרח",
          "parent": "",
          "ext": "5"
        },
        {
          "code": "מערב",
          "label": "מערב",
          "parent": "",
          "ext": "1"
        },
        {
          "code": "צפון־מזרח",
          "label": "צפון־מזרח",
          "parent": "",
          "ext": "6"
        },
        {
          "code": "צפון־מערב",
          "label": "צפון־מערב",
          "parent": "",
          "ext": "8"
        },
        {
          "code": "דרום־מזרח",
          "label": "דרום־מזרח",
          "parent": "",
          "ext": "4"
        },
        {
          "code": "דרום־מערב",
          "label": "דרום־מערב",
          "parent": "",
          "ext": "2"
        }
      ]
    },
    "Level": {
      "name": "Level",
      "desc": "רמת כנף (פ-6, פ-7) — מפתח חיצוני = קוד הרמה (אות)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "עליון",
          "label": "עליון",
          "parent": "",
          "ext": "א"
        },
        {
          "code": "אמצעי",
          "label": "אמצעי",
          "parent": "",
          "ext": "ב"
        },
        {
          "code": "תחתון",
          "label": "תחתון",
          "parent": "",
          "ext": "ג"
        }
      ]
    },
    "ComponentType": {
      "name": "ComponentType",
      "desc": "סוג תשתית / רכיב שלט (עמוד ומסד = תשתית; השאר = רכיבי שילוט)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "לוח",
          "label": "לוח",
          "parent": ""
        },
        {
          "code": "כנף",
          "label": "כנף",
          "parent": ""
        },
        {
          "code": "עמוד",
          "label": "עמוד",
          "parent": ""
        },
        {
          "code": "מסד",
          "label": "מסד",
          "parent": ""
        },
        {
          "code": "פיקטוגרמה",
          "label": "פיקטוגרמה",
          "parent": ""
        },
        {
          "code": "אביזר",
          "label": "אביזר",
          "parent": ""
        }
      ]
    },
    "MigrationStatus": {
      "name": "MigrationStatus",
      "desc": "סטטוס הסבה (מוצע)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "הומר אוטומטית",
          "label": "הומר אוטומטית",
          "parent": ""
        },
        {
          "code": "ממתין לטיוב",
          "label": "ממתין לטיוב",
          "parent": ""
        },
        {
          "code": "טויב על ידי הלקוח",
          "label": "טויב על ידי הלקוח",
          "parent": ""
        },
        {
          "code": "חריג",
          "label": "חריג",
          "parent": ""
        }
      ]
    },
    "VisitType": {
      "name": "VisitType",
      "desc": "סוג ביקור בשלט (מעקב / פיקוח / טיפול; ניתן להרחבה)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "מעקב",
          "label": "מעקב",
          "parent": "",
          "ext": ""
        },
        {
          "code": "פיקוח",
          "label": "פיקוח",
          "parent": "",
          "ext": ""
        },
        {
          "code": "טיפול",
          "label": "טיפול",
          "parent": "",
          "ext": ""
        }
      ]
    },
    "PartStatus": {
      "name": "PartStatus",
      "desc": "מצב תשתית / רכיב (מוצע)",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "תקין",
          "label": "תקין",
          "parent": "",
          "ext": ""
        },
        {
          "code": "לא תקין",
          "label": "לא תקין",
          "parent": "",
          "ext": ""
        },
        {
          "code": "חסר",
          "label": "חסר",
          "parent": "",
          "ext": ""
        },
        {
          "code": "לפירוק",
          "label": "לפירוק",
          "parent": "",
          "ext": ""
        }
      ]
    },
    "Supplier": {
      "name": "Supplier",
      "desc": "ספקי שילוט (רשימה טרם נמסרה; מתוחזקת על ידי מנהל המוצר)",
      "fieldType": "TEXT",
      "values": []
    },
    "Mapper": {
      "name": "Mapper",
      "desc": "ממפים (רשימה טרם נמסרה; מתוחזקת על ידי הלקוח). ext = שם המשתמש ב-AGOL, לבחירת ברירת מחדל לפי המשתמש המחובר",
      "fieldType": "TEXT",
      "values": []
    },
    "Pictogram": {
      "name": "Pictogram",
      "desc": "פיקטוגרמות מהקטלוג (טרם נמסר; יסונן לפי תת דגם: parent = תת דגם)",
      "fieldType": "TEXT",
      "values": []
    }
  },
  "entities": [
    {
      "name": "Signs",
      "alias": "שלטי יער",
      "kind": "point",
      "attachments": true,
      "editorTracking": true,
      "description": "שכבת השלטים — מצב עדכני אחד לכל שלט פיזי. עדכון שלט קיים אינו יוצר רשומה חדשה.",
      "fields": [
        {
          "category": "זיהוי",
          "name": "SignID",
          "alias": "מזהה שלט",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "תמיד (קריאה בלבד)",
          "open": true,
          "note": "פורמט והקצאה טרם אושרו. הצעה זמנית: SGN-yymmdd-NNNN, נוצר בטופס פעם אחת (once) גם ללא קליטה. ייחודיות לא מובטחת בין קבלנים, לכן בדיקת כפילות בשרת (Notebook) לפני אישור פורמט סופי. GlobalID הוא המפתח היציב.",
          "calc": "once(concat(\"SGN-\", format-date(today(), \"%y%m%d\"), \"-\", int(random() * 9000 + 1000)))"
        },
        {
          "category": "זיהוי",
          "name": "MapperName",
          "alias": "שם הממפה",
          "type": "TEXT",
          "length": "255",
          "domain": "Mapper",
          "mode": "רשימה",
          "visible": "בשלט חדש: ניתן לשינוי; בעריכה: קריאה בלבד",
          "open": true,
          "note": "מקור הערכים: רשימה שהלקוח מספק (ext = שם משתמש AGOL). ברירת מחדל בשלט חדש: הפריט שה-ext שלו שווה למשתמש המחובר, ניתן לשנות. בעריכה השדה נעול ואינו מתעדכן. אינו תלוי ב-Editor Tracking.",
          "required": true,
          "autoValue": "usernameList",
          "autoOnCreate": true,
          "calc": "once(instance(\"Mapper\")/root/item[ext=pulldata(\"@property\", \"username\")]/name)",
          "readonlyExpr": "pulldata(\"@property\", 'mode') = 'edit'",
          "readonlyOnEdit": true
        },
        {
          "category": "סיווג",
          "name": "ModelFamily",
          "alias": "משפחת דגם שלט",
          "type": "TEXT",
          "length": "255",
          "domain": "ModelFamily",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "note": "מפתח סינון לתת-דגם (choice_filter / Contingent Values).",
          "required": true
        },
        {
          "category": "סיווג",
          "name": "SignModel",
          "alias": "דגם השלט (תת דגם)",
          "type": "TEXT",
          "length": "255",
          "domain": "SignSubModel",
          "mode": "רשימה",
          "visible": "לפי משפחה",
          "open": false,
          "note": "מיפוי ל״דגם השלט״ בשכבה הקיימת. שני ערכי פ-4.1 נבדלים בתווית, ולכן הקוד הכפול אינו חוסם; ההכרעה נדרשת רק ל-ModelCode.",
          "required": true
        },
        {
          "category": "סיווג",
          "name": "ModelCode",
          "alias": "קוד דגם (לממשקים)",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": "מחושב אוטומטית מ-SignModel לפי \"מפתח חיצוני\" (ext) בדומיין SignSubModel (למשל P3.1). מתעדכן בכל שינוי בבחירת הדגם. לממשקים עם מערכות ארגוניות.",
          "derive": {
            "from": "SignModel",
            "attr": "ext"
          },
          "calc": "instance(\"SignSubModel\")/root/item[name=${SignModel}]/ext"
        },
        {
          "category": "סיווג",
          "name": "TrafficSignType",
          "alias": "תמרור",
          "type": "TEXT",
          "length": "255",
          "domain": "TrafficSign",
          "mode": "רשימה",
          "visible": "רק כאשר משפחה = P11",
          "open": false,
          "note": "11 ערכים; אין קודים טכניים.",
          "rel": {
            "f": "ModelFamily",
            "op": "=",
            "v": "פ-11: שלט תמרור"
          },
          "required": true
        },
        {
          "category": "סיווג",
          "name": "NewSignageTheory",
          "alias": "תורת שילוט חדשה",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": true,
          "note": "ערכים ואופן סימון טעונים אישור; אין להניח כן/לא."
        },
        {
          "category": "סיווג",
          "name": "ReplacedToNewTheory",
          "alias": "הוחלף לתורת השילוט החדשה",
          "type": "TEXT",
          "length": "255",
          "domain": "YesNo",
          "mode": "ידני",
          "visible": "תמיד",
          "open": true,
          "note": "מוצע על ידינו: תנאי הזיהוי של \"החלפה\" טעון אישור (סעיף 16 #4). מפעיל את הצגת ספק/תאריך הנפקה."
        },
        {
          "category": "מצב",
          "name": "SignStatus",
          "alias": "מצב שלט בשטח",
          "type": "TEXT",
          "length": "255",
          "domain": "SignStatus",
          "mode": "ידני במיפוי; אחר כך אוטומטי",
          "visible": "במיפוי: למילוי. בעריכה: קריאה בלבד (Make)",
          "open": false,
          "note": "עותק נוכחי של מצב השלט, מתעדכן אוטומטית מהביקור האחרון (מקור האמת: SignVisits.StatusAtVisit). נשאר שדה פיזי כדי לצבוע במפה, לסנן דוחות ולייצא ל-DATA. עדכון בפועל: תרחיש Make B (D28), לא נוסחה בטופס ולא ביטוי ב-Field Maps. במיפוי חדש הערך נאסף ישירות כאן ומועתק על ידי Make A לשורת הביקור הראשונה (D28).",
          "fromVisit": "StatusAtVisit",
          "required": true
        },
        {
          "category": "מצב",
          "name": "SafetyHazard",
          "alias": "סיווג בטיחותי",
          "type": "TEXT",
          "length": "255",
          "domain": "SafetyHazard",
          "mode": "ידני במיפוי; אחר כך אוטומטי",
          "visible": "במיפוי: רק כשמצב = לא תקין (חובה). בעריכה: קריאה בלבד (Make)",
          "open": false,
          "note": "עותק נוכחי מהביקור האחרון (SignVisits.SafetyHazardAtVisit). הדוח היומי מסנן עליו. עדכון בפועל: תרחיש Make B (D28), לא נוסחה בטופס ולא ביטוי ב-Field Maps. במיפוי חדש הערך נאסף ישירות כאן ומועתק על ידי Make A לשורת הביקור הראשונה (D28).",
          "rel": {
            "f": "SignStatus",
            "op": "=",
            "v": "לא תקין"
          },
          "fromVisit": "SafetyHazardAtVisit",
          "reqIf": {
            "f": "SignStatus",
            "op": "=",
            "v": "לא תקין"
          }
        },
        {
          "category": "מצב",
          "name": "FaultNotes",
          "alias": "מהות התקלה / הערות",
          "type": "TEXT",
          "length": "1000",
          "domain": "",
          "mode": "ידני במיפוי; אחר כך אוטומטי",
          "visible": "במיפוי: רק כשמצב = לא תקין (חובה). בעריכה: קריאה בלבד (Make)",
          "open": false,
          "note": "שדה מקור היסטורי (מהות תקלה). נשאר פיזי כעותק נוכחי; מתמלא מ״מה נמצא / מה בוצע״ בביקור האחרון כשהמצב לא תקין. מיפוי טעון אישור. עדכון בפועל: תרחיש Make B (D28), לא נוסחה בטופס ולא ביטוי ב-Field Maps. במיפוי חדש הערך נאסף ישירות כאן ומועתק על ידי Make A לשורת הביקור הראשונה (D28).",
          "fromVisit": "VisitSummary",
          "fromVisitWhen": {
            "f": "StatusAtVisit",
            "v": "לא תקין"
          },
          "reqIf": {
            "f": "SignStatus",
            "op": "=",
            "v": "לא תקין"
          }
        },
        {
          "category": "תוכן ומיקום",
          "name": "SignContentText",
          "alias": "תוכן / הסבר בשלט בטקסט",
          "type": "TEXT",
          "length": "1000",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": ""
        },
        {
          "category": "תוכן ומיקום",
          "name": "LocationDescription",
          "alias": "מיקום השלט במלל",
          "type": "TEXT",
          "length": "500",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": ""
        },
        {
          "category": "כתובת יערנית",
          "name": "DistrictName",
          "alias": "שם מרחב",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": "שיוך מרחבי (Intersect) — מקור וכלל להשלמה. חישוב אוטומטי מהמיקום (נקודה בפוליגון); שם השכבה והשדה בשכבת המקור טרם נמסרו.",
          "calc": "pulldata(\"@layer\", \"getValueAt\", \"attributes.<שדה בשכבת היערות>\", \"<FORESTS_LAYER_URL>\", ${location}, \"\")"
        },
        {
          "category": "כתובת יערנית",
          "name": "RegionName",
          "alias": "שם אזור",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": "חישוב אוטומטי מהמיקום (נקודה בפוליגון); שם השכבה והשדה בשכבת המקור טרם נמסרו.",
          "calc": "pulldata(\"@layer\", \"getValueAt\", \"attributes.<שדה בשכבת היערות>\", \"<FORESTS_LAYER_URL>\", ${location}, \"\")"
        },
        {
          "category": "כתובת יערנית",
          "name": "GushName",
          "alias": "שם גוש יערני",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": "חישוב אוטומטי מהמיקום (נקודה בפוליגון); שם השכבה והשדה בשכבת המקור טרם נמסרו.",
          "calc": "pulldata(\"@layer\", \"getValueAt\", \"attributes.<שדה בשכבת היערות>\", \"<FORESTS_LAYER_URL>\", ${location}, \"\")"
        },
        {
          "category": "כתובת יערנית",
          "name": "ForestName",
          "alias": "שם יער",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": "חישוב אוטומטי מהמיקום (נקודה בפוליגון); שם השכבה והשדה בשכבת המקור טרם נמסרו.",
          "calc": "pulldata(\"@layer\", \"getValueAt\", \"attributes.<שדה בשכבת היערות>\", \"<FORESTS_LAYER_URL>\", ${location}, \"\")"
        },
        {
          "category": "כתובת יערנית",
          "name": "ForestNumber",
          "alias": "מספר יער",
          "type": "SHORT",
          "length": "",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": true,
          "note": "אם המזהה כולל XXXX עם אפסים מובילים — לשקול TEXT. חישוב אוטומטי מהמיקום (נקודה בפוליגון); שם השכבה והשדה בשכבת המקור טרם נמסרו.",
          "calc": "pulldata(\"@layer\", \"getValueAt\", \"attributes.<שדה בשכבת היערות>\", \"<FORESTS_LAYER_URL>\", ${location}, \"\")"
        },
        {
          "category": "כתובת יערנית",
          "name": "ResponsibleUnit",
          "alias": "יחידה אחראית",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": true,
          "note": "שם מקור טכני וכלל שיוך טרם פורטו. חישוב אוטומטי מהמיקום (נקודה בפוליגון); שם השכבה והשדה בשכבת המקור טרם נמסרו.",
          "calc": "pulldata(\"@layer\", \"getValueAt\", \"attributes.<שדה בשכבת היערות>\", \"<FORESTS_LAYER_URL>\", ${location}, \"\")"
        },
        {
          "category": "כתובת יערנית",
          "name": "RoadName",
          "alias": "שם דרך / ציר",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": true,
          "note": "מקור גזירה וכלל שיוך להשלמה."
        },
        {
          "category": "כתובת יערנית",
          "name": "RoadColor",
          "alias": "צבע דרך / ציר",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": true,
          "note": "אין להסיק צבע ממיקום ללא כלל שיוך מאושר."
        },
        {
          "category": "החלפה והצבה",
          "name": "PlacementDate",
          "alias": "תאריך הצבת שלט חדש",
          "type": "DATE",
          "length": "",
          "domain": "",
          "mode": "ידני",
          "visible": "רק בהחלפה לתורת השילוט החדשה",
          "open": true,
          "note": "נשאר ברמת השלט (עובדה חד-פעמית על השלט, לא תצפית של ביקור). ברירת מחדל: היום (לפי צילום הדרישה). מקור, אירוע מילוי וקדימות מול הזנה ידנית להכרעה.",
          "rel": {
            "f": "ReplacedToNewTheory",
            "op": "=",
            "v": "כן"
          },
          "autoValue": "today"
        },
        {
          "category": "החלפה והצבה",
          "name": "MappingDate",
          "alias": "תאריך מיפוי",
          "type": "DATE",
          "length": "",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": true,
          "note": "נקבע פעם אחת ביצירת השלט (once). שדה מקור היסטורי.",
          "autoValue": "today",
          "autoOnCreate": true,
          "calc": "once(today())"
        },
        {
          "category": "QR",
          "name": "QRInternal",
          "alias": "QR פנימי",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "מערכת",
          "visible": "מוסתר מהסוקר",
          "open": true,
          "note": "זיהוי פנימי יציב של השלט (גם אם נשרף). מוצע: קישור מתבנית על בסיס GlobalID, נוצר בשרת. אינו מוצג בסקר; מוצג בפופאפ ב-Field Maps. תבנית וכתובת בסיס טרם נמסרו."
        },
        {
          "category": "QR",
          "name": "QRExternal",
          "alias": "QR חיצוני",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "מערכת",
          "visible": "מוסתר מהסוקר",
          "open": true,
          "note": "קישור לדף מידע למבקרים. מוצע: קישור מתבנית על בסיס מזהה השלט, נוצר בשרת. אינו מוצג בסקר. תבנית, כתובת הדף ואירוע הפקה טרם נמסרו."
        },
        {
          "category": "הסבה (היסטורי)",
          "name": "MigrationStatus",
          "alias": "סטטוס הסבה",
          "type": "TEXT",
          "length": "255",
          "domain": "MigrationStatus",
          "mode": "מערכת",
          "visible": "מוסתר מהסוקר",
          "open": false,
          "note": "מוצע: מנהל את רשימת הטיוב מול הלקוח."
        },
        {
          "category": "הסבה (היסטורי)",
          "name": "LegacyObjectID",
          "alias": "OBJECTID ישן",
          "type": "LONG",
          "length": "",
          "domain": "",
          "mode": "היסטורי",
          "visible": "מוסתר",
          "open": false,
          "note": "נשמר מהשכבה השטוחה."
        },
        {
          "category": "הסבה (היסטורי)",
          "name": "LegacyGlobalID",
          "alias": "GlobalID ישן",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "היסטורי",
          "visible": "מוסתר",
          "open": false,
          "note": ""
        },
        {
          "category": "הסבה (היסטורי)",
          "name": "LegacySignName",
          "alias": "שם שלט (ישן)",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "היסטורי",
          "visible": "מוסתר",
          "open": false,
          "note": ""
        },
        {
          "category": "הסבה (היסטורי)",
          "name": "LegacySignType",
          "alias": "סוג שלט (ישן)",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "היסטורי",
          "visible": "מוסתר",
          "open": false,
          "note": "מקור ההמרה לדגם החדש."
        },
        {
          "category": "הסבה (היסטורי)",
          "name": "LegacyTypeAlt",
          "alias": "סוג השלט (ישן, שדה נוסף)",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "היסטורי",
          "visible": "מוסתר",
          "open": true,
          "note": "לאמת מול השכבה הקיימת אם זה שדה נפרד."
        }
      ],
      "groupOrder": [
        "כתובת יערנית",
        "זיהוי",
        "סיווג",
        "תוכן ומיקום",
        "החלפה והצבה",
        "מצב",
        "QR"
      ]
    },
    {
      "name": "SignParts",
      "alias": "תשתיות ורכיבים",
      "kind": "table",
      "attachments": false,
      "editorTracking": true,
      "description": "טבלה אחת לתשתית השלט (עמוד/ים, מסד) ולרכיבי השילוט שעליה (לוח, כנף, פיקטוגרמה, אביזר). שורה לכל עמוד / רכיב; שלט יכול לעמוד על כמה עמודים. שדות שאינם רלוונטיים לסוג שנבחר נשארים ריקים (מוצגים לפי תנאי). יחס 1:N ל-Signs. בסקר: Repeat. מצב, תקלה, ספק ותאריך הנפקה מנוהלים לכל תשתית / רכיב, כדי לתעד החלפה או תיקון של רכיב בודד.",
      "fields": [
        {
          "category": "קשר",
          "name": "ParentGlobalID",
          "alias": "מזהה שלט אב",
          "type": "GUID",
          "length": "",
          "domain": "",
          "mode": "מערכת",
          "visible": "מוסתר",
          "open": false,
          "note": "מפתח זר ל-Signs.GlobalID"
        },
        {
          "category": "רכיב",
          "name": "ComponentType",
          "alias": "סוג תשתית / רכיב",
          "type": "TEXT",
          "length": "255",
          "domain": "ComponentType",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "note": "עמוד ומסד = תשתית; לוח, כנף, פיקטוגרמה, אביזר = רכיבי שילוט. שדות הרכיב (כנף, כיוון, מפלס, פיקטוגרמה) מוצגים רק לרכיבי שילוט.",
          "required": true
        },
        {
          "category": "רכיב",
          "name": "WingNumber",
          "alias": "מספר כנף",
          "type": "SHORT",
          "length": "",
          "domain": "",
          "mode": "ידני",
          "visible": "רק בפ-6 / פ-7 וכשהרכיב הוא כנף",
          "open": true,
          "note": "כמות כנפיים וצירופים מותרים — ממתין לקטלוג.",
          "rel": {
            "all": [
              {
                "f": "^ModelFamily",
                "op": "in",
                "v": [
                  "פ-6: שלט הכוונה (כנפיים)",
                  "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל"
                ]
              },
              {
                "f": "ComponentType",
                "op": "=",
                "v": "כנף"
              }
            ]
          }
        },
        {
          "category": "רכיב",
          "name": "Direction",
          "alias": "כיוון",
          "type": "TEXT",
          "length": "255",
          "domain": "Direction",
          "mode": "רשימה",
          "visible": "רק בפ-6 / פ-7 וכשהרכיב הוא כנף",
          "open": false,
          "note": "ערך טקסטואלי; הקוד המספרי בשדה DirectionCode.",
          "rel": {
            "all": [
              {
                "f": "^ModelFamily",
                "op": "in",
                "v": [
                  "פ-6: שלט הכוונה (כנפיים)",
                  "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל"
                ]
              },
              {
                "f": "ComponentType",
                "op": "=",
                "v": "כנף"
              }
            ]
          }
        },
        {
          "category": "רכיב",
          "name": "Level",
          "alias": "רמה",
          "type": "TEXT",
          "length": "255",
          "domain": "Level",
          "mode": "רשימה",
          "visible": "רק בפ-6 / פ-7 וכשהרכיב הוא כנף",
          "open": false,
          "note": "ערך טקסטואלי; הקוד בשדה LevelCode.",
          "rel": {
            "all": [
              {
                "f": "^ModelFamily",
                "op": "in",
                "v": [
                  "פ-6: שלט הכוונה (כנפיים)",
                  "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל"
                ]
              },
              {
                "f": "ComponentType",
                "op": "=",
                "v": "כנף"
              }
            ]
          }
        },
        {
          "category": "רכיב",
          "name": "PictogramCode",
          "alias": "פיקטוגרמה",
          "type": "TEXT",
          "length": "255",
          "domain": "Pictogram",
          "mode": "רשימה",
          "visible": "רק כשהרכיב הוא פיקטוגרמה (רשימה לפי דגם, טעונה קטלוג)",
          "open": true,
          "note": "רשימה מהקטלוג, מסוננת לפי תת דגם. הקטלוג (מאפייני_שלטים_30062026.xlsx) טרם נמסר, ולכן אין ערכים.",
          "rel": {
            "f": "ComponentType",
            "op": "=",
            "v": "פיקטוגרמה"
          }
        },
        {
          "category": "רכיב",
          "name": "SupplierName",
          "alias": "ספק השילוט",
          "type": "TEXT",
          "length": "255",
          "domain": "Supplier",
          "mode": "רשימה",
          "visible": "רק בהחלפה לתורת השילוט החדשה (לפי Signs.ReplacedToNewTheory)",
          "open": true,
          "note": "רשימת בחירה מתוחזקת (אין שמות ספקים באפיון). מופיע רק בהחלפה לתורת השילוט החדשה.",
          "rel": {
            "f": "^ReplacedToNewTheory",
            "op": "=",
            "v": "כן"
          }
        },
        {
          "category": "רכיב",
          "name": "IssueDate",
          "alias": "תאריך הנפקת שלט לקק״ל",
          "type": "DATE",
          "length": "",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "רק בהחלפה לתורת השילוט החדשה (לפי Signs.ReplacedToNewTheory)",
          "open": true,
          "note": "הועבר מ-Signs: תאריך הנפקה לכל רכיב שהוחלף. מקור ואירוע מילוי טעונים אישור.",
          "rel": {
            "f": "^ReplacedToNewTheory",
            "op": "=",
            "v": "כן"
          },
          "autoValue": "today"
        },
        {
          "category": "רכיב",
          "name": "ComponentNotes",
          "alias": "הערות לרכיב",
          "type": "TEXT",
          "length": "500",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": ""
        }
      ]
    },
    {
      "name": "SignVisits",
      "alias": "ביקורים בשלט",
      "kind": "table",
      "attachments": true,
      "editorTracking": true,
      "description": "יומן ביקורים חוזרים בשלט (מעקב, פיקוח, טיפול ועוד). ביקור אחד = שורה אחת: מתי, מי, סוג הביקור, מצב השלט הכולל ומה בוצע; לצד תמונות (Attachments). יחס 1:N ל-Signs. מצב כל רכיב שנבדק בביקור נשמר בטבלת הבן SignPartStatus (1:N לביקור).",
      "fields": [
        {
          "category": "קשר",
          "name": "ParentGlobalID",
          "alias": "מזהה שלט אב",
          "type": "GUID",
          "length": "",
          "domain": "",
          "mode": "מערכת",
          "visible": "מוסתר",
          "open": false,
          "note": "מפתח זר ל-Signs.GlobalID"
        },
        {
          "category": "דיווח",
          "name": "VisitDate",
          "alias": "תאריך ביקור",
          "type": "DATE",
          "length": "",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": "",
          "autoValue": "today",
          "calc": "today()"
        },
        {
          "category": "דיווח",
          "name": "VisitType",
          "alias": "סוג ביקור",
          "type": "TEXT",
          "length": "255",
          "domain": "VisitType",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": true,
          "note": "מעקב / פיקוח / טיפול (ניתן להרחבה).",
          "required": true
        },
        {
          "category": "דיווח",
          "name": "VisitorName",
          "alias": "שם המבקר",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": "נפרד מ-Creator/Editor של רשומת השלט.",
          "autoValue": "username",
          "calc": "pulldata(\"@property\", \"username\")"
        },
        {
          "category": "תמונת מצב",
          "name": "StatusAtVisit",
          "alias": "מצב שלט בעת הביקור",
          "type": "TEXT",
          "length": "255",
          "domain": "SignStatus",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "note": "מקור האמת למצב השלט הכולל. עותק נוכחי מתעדכן ב-Signs. אזהרה (לא חסימה) כשמדווח רכיב לא תקין/חסר והמצב תקין; האפיון אינו מחשב מצב שלט ממצב רכיבים.",
          "required": true,
          "warn": "partsNotOk"
        },
        {
          "category": "תמונת מצב",
          "name": "SafetyHazardAtVisit",
          "alias": "סיווג בטיחותי בעת הביקור",
          "type": "TEXT",
          "length": "255",
          "domain": "SafetyHazard",
          "mode": "רשימה",
          "visible": "רק כאשר מצב = לא תקין",
          "open": false,
          "note": "",
          "rel": {
            "f": "StatusAtVisit",
            "op": "=",
            "v": "לא תקין"
          },
          "required": true
        },
        {
          "category": "תוכן",
          "name": "VisitSummary",
          "alias": "מה נמצא / מה בוצע",
          "type": "TEXT",
          "length": "1000",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": "מה נמצא / מה בוצע בשלט. חובה כשמצב השלט לא תקין. ממצא ברכיב נרשם בשורת המצב של הרכיב (PartNotes).",
          "reqIf": {
            "f": "StatusAtVisit",
            "op": "=",
            "v": "לא תקין"
          }
        },
        {
          "category": "תוכן",
          "name": "VisitNotes",
          "alias": "הערות ביקור",
          "type": "TEXT",
          "length": "1000",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": ""
        }
      ]
    },
    {
      "name": "SignPartStatus",
      "alias": "מצב רכיב בביקור",
      "kind": "table",
      "attachments": true,
      "editorTracking": true,
      "description": "מצב רכיב אחד בביקור אחד. שורה נוצרת רק לרכיב שנבדק או שיש בו ממצא; רכיב שלא דווח אינו מקבל שורה ומוצג בפופאפ \"לא דווח\". יחס 1:N לביקור (ParentGlobalID = GlobalID של הביקור). המצב הנוכחי של רכיב = השורה האחרונה שדיווחה עליו.",
      "fields": [
        {
          "category": "קשר",
          "name": "ParentGlobalID",
          "alias": "מזהה ביקור אב",
          "type": "GUID",
          "length": "",
          "domain": "",
          "mode": "מערכת",
          "visible": "מוסתר",
          "open": false,
          "note": "מפתח זר ל-SignVisits.GlobalID"
        },
        {
          "category": "דיווח",
          "name": "RelatedPartGlobalID",
          "alias": "רכיב",
          "type": "GUID",
          "length": "",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד; ממולא מראש מהכפתור בפופאפ הביקור",
          "open": true,
          "required": true,
          "pickFrom": "SignParts",
          "note": "הרכיב שמדווח. ב-Field Maps מגיע מהקישור (featureAttributes); ב-Survey123 נבחר מרכיבי הטופס. הרכיב חייב להיות שייך לשלט של הביקור (בדיקת שלמות)."
        },
        {
          "category": "דיווח",
          "name": "PartStatusAtVisit",
          "alias": "מצב רכיב בעת הביקור",
          "type": "TEXT",
          "length": "255",
          "domain": "PartStatus",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "required": true,
          "note": "מקור האמת למצב רכיב. המצב הנוכחי של רכיב = השורה האחרונה שדיווחה עליו, ומוצג בפופאפ (Arcade) ולא נשמר כשדה."
        },
        {
          "category": "תוכן",
          "name": "PartNotes",
          "alias": "מה נמצא / מה בוצע ברכיב",
          "type": "TEXT",
          "length": "1000",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": "מהות התקלה או הטיפול ברכיב (מחליף את PartFaultNotes). חובה כשהרכיב לא תקין או חסר.",
          "reqIf": {
            "f": "PartStatusAtVisit",
            "op": "in",
            "v": [
              "לא תקין",
              "חסר"
            ]
          }
        }
      ]
    },
    {
      "name": "ResponsibleLookup",
      "alias": "אחראים לפי אזור (טבלת עזר)",
      "kind": "table",
      "attachments": false,
      "editorTracking": true,
      "description": "טבלת הגדרות שמתוחזקת על ידי מנהל המוצר. אין קשר GlobalID לשלטים; השיוך הוא לפי ערך האזור. משמשת פופאפ, דוחות ודיוור.",
      "fields": [
        {
          "category": "מפתח",
          "name": "AreaName",
          "alias": "שם האזור (מפתח)",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "ידני",
          "visible": "תחזוקה בלבד",
          "open": true,
          "note": "רמת המפתח (מרחב / אזור / יחידה אחראית) טעונה אישור הלקוח. נבחר ערך שם אזור כברירת מחדל."
        },
        {
          "category": "אחראים",
          "name": "ParkingCoordinator",
          "alias": "רכז חניונים",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "ידני",
          "visible": "תחזוקה בלבד",
          "open": true,
          "note": "מוסתר מהסוקר. נדרש לדוחות ולדיוור."
        },
        {
          "category": "אחראים",
          "name": "VisitorCoordinator",
          "alias": "רכזת קליטת קהל",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "ידני",
          "visible": "תחזוקה בלבד",
          "open": true,
          "note": "נדרש לדוחות ולדיוור. מקבלת את הדוח ומעבירה לחברת הייצור."
        }
      ]
    },
    {
      "name": "ModelImages",
      "alias": "תמונות דגמים (טבלת עזר)",
      "kind": "table",
      "attachments": false,
      "editorTracking": true,
      "description": "טבלת עזר מתארחת שמחברת קוד דגם לקישור ציבורי של קובץ PNG (פריט Image ב-AGOL ששותף לכולם). אין קשר GlobalID; השיוך לפי ModelCode. משמשת את פופאפ השלט. ב-Survey123 התמונות נשארות קבצי media בתיקיית הטופס.",
      "fields": [
        {
          "category": "מפתח",
          "name": "ModelCode",
          "alias": "קוד דגם (מפתח)",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "ידני",
          "visible": "תחזוקה בלבד",
          "open": false,
          "note": "זהה לקוד החיצוני (ext) של ערך SignSubModel, למשל P3.1."
        },
        {
          "category": "תמונה",
          "name": "ImageURL",
          "alias": "קישור לתמונה",
          "type": "TEXT",
          "length": "1000",
          "domain": "",
          "mode": "ידני",
          "visible": "תחזוקה בלבד",
          "open": false,
          "note": "כתובת ציבורית מלאה של פריט ה-PNG ב-AGOL (…/sharing/rest/content/items/<itemId>/data)."
        },
        {
          "category": "תמונה",
          "name": "ImageItemID",
          "alias": "מזהה פריט ב-AGOL",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "ידני",
          "visible": "תחזוקה בלבד",
          "open": false,
          "note": "לא חובה. מקל על החלפת תמונה בלי לשנות את הקישור."
        }
      ]
    }
  ],
  "relationships": [
    {
      "name": "Signs_SignParts",
      "origin": "Signs",
      "destination": "SignParts",
      "originKey": "GlobalID",
      "destKey": "ParentGlobalID",
      "type": "COMPOSITE",
      "forward": "תשתיות ורכיבים",
      "backward": "שלט"
    },
    {
      "name": "Signs_SignVisits",
      "origin": "Signs",
      "destination": "SignVisits",
      "originKey": "GlobalID",
      "destKey": "ParentGlobalID",
      "type": "SIMPLE",
      "forward": "ביקורים",
      "backward": "שלט"
    },
    {
      "name": "SignVisits_SignPartStatus",
      "origin": "SignVisits",
      "destination": "SignPartStatus",
      "originKey": "GlobalID",
      "destKey": "ParentGlobalID",
      "type": "COMPOSITE",
      "forward": "מצבי רכיבים",
      "backward": "ביקור"
    }
  ],
  "automations": [
    {
      "title": "עדכון שלט מביקורים (Make, החלטה D28)",
      "blocks": [
        {
          "t": "p",
          "text": "מטרה: (1) שלט חדש שנוצר בשכבה Signs מקבל אוטומטית שורת ביקור ראשונה ב-SignVisits. (2) אחרי כל ביקור, מצב השלט הנוכחי (SignStatus, SafetyHazard, FaultNotes) מועתק מהביקור האחרון ל-Signs, גם כשהביקור נוצר ב-Field Maps בלי לפתוח את טופס העריכה של השלט. סיבה: Attribute Rules אינם נתמכים בשכבות מתארחות ב-AGOL, וביטוי מחושב ב-Field Maps אינו כותב לרשומת האב."
        },
        {
          "t": "p",
          "text": "סטטוס: אפיון לבנייה על ידי רייצ׳ל. טרם נבנה ולא נבדק. עיכוב בין שמירה בשטח לעדכון השלט הוא בדקות (לא נמדד). המסמך המלא: SignageSurvey/Docs/אפיון-תרחישי-Make-לרייצל.md."
        },
        {
          "t": "h3",
          "text": "תרחישים",
          "team": true
        },
        {
          "t": "table",
          "team": true,
          "head": [
            "תרחיש",
            "טריגר",
            "פעולה"
          ],
          "w": [
            16,
            34,
            50
          ],
          "rows": [
            [
              "A: ביקור ראשון לשלט חדש",
              "Watch Features על Signs, אירוע Created בלבד",
              "בדיקה שאין עדיין ביקור לשלט; יצירת שורה ב-SignVisits: ParentGlobalID, VisitDate, VisitType (מעקב, לאישור), VisitorName (MapperName), StatusAtVisit, SafetyHazardAtVisit, VisitSummary מערכי השלט"
            ],
            [
              "B: העתקת הביקור האחרון לשלט",
              "Watch Features על SignVisits, אירועים Created ו-Updated",
              "שליפת הביקור האחרון של השלט (לפי VisitDate, ואחריו CreationDate); המשך רק אם זה הביקור שהפעיל את התרחיש; עדכון Signs: SignStatus, SafetyHazard, ו-FaultNotes (מ-VisitSummary רק כשהמצב לא תקין, אחרת ריק)"
            ]
          ]
        },
        {
          "t": "h3",
          "text": "כללים ודרישות",
          "team": true
        },
        {
          "t": "table",
          "team": true,
          "head": [
            "נושא",
            "פירוט"
          ],
          "w": [
            22,
            78
          ],
          "rows": [
            [
              "דרישות ב-AGOL",
              "Keep track of changes מופעל ב-Signs וב-SignVisits; משתמש שירות ייעודי עם הרשאת עריכה; מקסימום 10 webhooks לשכבה; חיבור Make פג אחרי 90 יום ללא שימוש"
            ],
            [
              "מניעת לולאות",
              "A מאזין ל-Signs ליצירה בלבד, B מאזין ל-SignVisits בלבד וכותב ל-Signs. אין טריגר Updated על Signs"
            ],
            [
              "מניעת כפילות",
              "A בודק לפני יצירה שאין שורת ביקור לשלט. אם Survey123 יוצר שורת ביקור, A חייב להישאר כבוי"
            ],
            [
              "שגיאות",
              "ניסיון חוזר עד 3 פעמים ואז מייל התראה עם שם התרחיש ומזהי הרשומות; התראה נפרדת על חיבור שפג"
            ],
            [
              "הסבת 8,000 רשומות",
              "שני התרחישים כבויים בזמן ההסבה; יצירת ביקור ראשון לשלטים שהוסבו טעונה אישור"
            ],
            [
              "גיבוי",
              "מחברת ArcGIS Notebooks לילית שמשווה כל שלט לביקור האחרון שלו ומתקנת פערים (נכתבת בנפרד)"
            ],
            [
              "תכנון פעולות",
              "כ-4-6 פעולות לשלט חדש (A) וכ-6-8 לכל ביקור (B); נדרש אימות מול המכסה בתוכנית של קק״ל"
            ]
          ]
        },
        {
          "t": "h3",
          "text": "בדיקות קבלה",
          "team": true
        },
        {
          "t": "table",
          "team": true,
          "head": [
            "#",
            "בדיקה",
            "תוצאה צפויה"
          ],
          "w": [
            5,
            50,
            45
          ],
          "rows": [
            [
              "1",
              "שלט חדש במצב תקין",
              "נוצרת שורת ביקור אחת עם אותם ערכים; Signs לא משתנה"
            ],
            [
              "2",
              "שלט חדש לא תקין עם סיווג ומה נמצא",
              "הערכים מועתקים לביקור הראשון"
            ],
            [
              "3",
              "ביקור חדש ב-Field Maps, מצב לא תקין",
              "SignStatus, SafetyHazard ו-FaultNotes מתעדכנים בשלט בלי פתיחת טופס השלט"
            ],
            [
              "4",
              "ביקור חדש במצב תקין",
              "FaultNotes מתרוקן"
            ],
            [
              "5",
              "הוספת ביקור עם VisitDate ישן",
              "מצב השלט לא משתנה"
            ],
            [
              "6",
              "עריכת הביקור האחרון, ואחר כך עריכת ביקור ישן",
              "הראשונה מעדכנת את השלט, השנייה לא"
            ],
            [
              "7",
              "הרצה כפולה של A לאותו שלט",
              "לא נוצרת שורה שנייה"
            ],
            [
              "8",
              "כשל מדומה בחיבור",
              "מגיעה התראה במייל"
            ]
          ]
        }
      ]
    },
    {
      "title": "סביבת ניהול ב-Experience Builder (D29, טיוטת תכולה)",
      "blocks": [
        {
          "t": "p",
          "text": "קהל: מי שעוקב אחרי הפרויקט, מבצע בקרה (review) ומעדכן נתונים. יכולות נדרשות: צפייה בשלטים לפי יער, אישור תיקונים, הפקת דוחות, ועדכון נתונים."
        },
        {
          "t": "table",
          "head": [
            "יכולת",
            "תיאור",
            "סטטוס"
          ],
          "w": [
            24,
            56,
            20
          ],
          "rows": [
            [
              "שלטים לפי יער",
              "מפה וטבלה עם סינון לפי יער, אזור, מצב שלט וסיווג בטיחותי",
              "טיוטה"
            ],
            [
              "מעקב אחרי הפרויקט",
              "מדדי התקדמות (כמות שלטים, מצב, סיכון) ורשימת ביקורים לפי שלט",
              "טיוטה"
            ],
            [
              "אישור תיקונים",
              "אישור של ביקורי טיפול על ידי בקר",
              "פתוח: איפה נשמר האישור (שדה ב-SignVisits או טבלה נפרדת) ומי רשאי לאשר"
            ],
            [
              "עדכון נתונים",
              "עריכת שלט וביקור מתוך הסביבה, בהרשאות לפי תפקיד",
              "פתוח: אילו שדות ניתנים לעריכה ולמי"
            ],
            [
              "דוחות",
              "דוח יומי ושבועי, והפקה לפי דרישה (מסומנים בזרימת הנתונים כמתוכננים)",
              "פתוח: תוכן, תדירות והפצה"
            ]
          ]
        }
      ]
    }
  ],
  "decisions": [
    {
      "id": "D29",
      "title": "תכולת הפתרון כוללת גם מפה ב-Field Maps וסביבת ניהול ב-Experience Builder",
      "status": "open",
      "note": "הצעה לאפיון, טרם אושר: (1) מפת Field Maps: שכבת Signs וטבלאות SignVisits, SignParts, SignPartStatus, ResponsibleLookup, ModelImages; סימבולוגיה לפי SignStatus; פופאפ Arcade (signs-popup, visits-popup); טפסי עריכה; כפתורי ביקור. (2) סביבת ניהול ב-Experience Builder (נמסר על ידי גיא): משמשת מי שעוקב אחרי הפרויקט, מבצע בקרה (review) ומעדכן נתונים; צריכה לאפשר צפייה בשלטים לפי יער, אישור תיקונים והפקת דוחות. מפה, טבלת שלטים עם סינון (יער, אזור, מצב, סיווג בטיחותי), היסטוריית ביקורים לשלט, ודוחות יומי/שבועי (מסומנים בזרימת הנתונים כמתוכננים). פתוח: איפה נשמר אישור תיקון, אילו שדות ניתנים לעריכה ולמי, תוכן הדוחות והפצתם, ורשימת משתמשים ותפקידים. פירוט בפרק אוטומציות ואינטגרציות במסמך האפיון."
    },
    {
      "id": "D28",
      "title": "עדכון אוטומטי בין ביקורים לשלט באמצעות Make (תרחישי A ו-B), ולא Attribute Rules או ביטוי ב-Field Maps",
      "status": "decided",
      "note": "בעיה 1: אי אפשר ליצור שורת ביקור אוטומטית בטופס. בעיה 2: ב-Field Maps שורת בן לא מעדכנת את רשומת האב. Attribute Rules אינם נתמכים בשכבות מתארחות ב-AGOL, וביטוי מחושב ב-Field Maps כותב רק לרשומה שבטופס. החלטה: תרחיש A (Make, Watch Features על Signs, אירוע Created בלבד) יוצר שורת ביקור ראשונה (VisitDate, VisitType, VisitorName, StatusAtVisit, SafetyHazardAtVisit, VisitSummary) מערכי השלט. תרחיש B (Watch Features על SignVisits, Created ו-Updated) בודק אם השורה היא הביקור האחרון (לפי VisitDate) ואם כן מעתיק ל-Signs: SignStatus, SafetyHazard, FaultNotes (מ-VisitSummary כשהמצב לא תקין, אחרת ריק). גיבוי: מחברת לילית שמתקנת פערים. חסרונות: עיכוב של דקות (לא נמדד), תלות בחיבור Make (פג אחרי 90 יום ללא שימוש), נדרש Keep track of changes בשתי השכבות. כיבוי התרחישים בזמן הסבת הנתונים. לא נבדק בשטח. הוכרע: במיפוי חדש מצב, סיווג בטיחותי ומה נמצא נאספים ישירות בשדות Signs (SignStatus, SafetyHazard, FaultNotes), ו-Make A מעתיק אותם לשורת הביקור הראשונה. פתוח: סוג הביקור הראשון (מוצע: מעקב) ומניעת כפילות אם Survey123 יוצר שורת ביקור. פירוט: SignageSurvey/Docs/תרחישי-Make-עדכון-שלט-מביקור.md האפיון לבנייה ב-Make (רייצ׳ל): SignageSurvey/Docs/אפיון-תרחישי-Make-לרייצל.md"
    },
    {
      "id": "D27",
      "title": "שלוש רמות: שלט ← ביקור ← מצב רכיב בביקור (SignPartStatus)",
      "status": "decided",
      "note": "ביקור הוא שורה אחת ב-SignVisits (מצב שלט כולל, סכנה, סיכום, צילום), ומצב רכיב הוא שורה בטבלת הבן SignPartStatus (ParentGlobalID = GlobalID של הביקור, RelatedPartGlobalID, PartStatusAtVisit, PartNotes, צילום) רק לרכיב שנבדק או שיש בו ממצא. ספירת ביקורים לשלט = שורות SignVisits. יתרונות: ביקור = שורה אחת, יחס 1:N נקי, מצב רכיב מוגדר במקום אחד. חסרונות: טבלה נוספת, מצב נוכחי של רכיב דורש שאילתת Arcade בשתי רמות, ודוחות דורשים join. מענה בשטח: (1) ביקור שגרתי ללא רכיבים = טופס אחד ושמירה אחת, בלי שום תוספת. (2) ביקור עם ממצא ברכיב ב-Field Maps = טופס ביקור ושליחה, חזרה לפופאפ השלט, ובו כרטיס \"ביקור פתוח להיום\" (Arcade מוצא את ביקור היום ויודע את המזהה שלו) עם כפתור + לכל רכיב. הכפתור הוא קישור עומק addRelatedFeature שפותח ישר את טופס מצב הרכיב (רמה 3) עם הרכיב ממולא; נשארים מצב, הערה וצילום ושליחה, וחוזרים לפופאפ השלט (callback). זה נדרש כי Field Maps מציג טופס עריכה לרמה אחת ואין בו הוספת רשומת בת. קישור שיוצר את הביקור לא יכול להמשיך לטופס הרכיב, כי מזהה הביקור אינו ידוע בזמן בניית הקישור. ביקור ישן נפתח מרשימת הביקורים אל פופאפ הביקור. (3) קליטה חלשה = Survey123 ליצירה בלבד, ביקור וחזרה מקוננת של מצבי רכיב בטופס אחד. (4) עריכה ותיקון של ביקור או מצב רכיב קיים תמיד ב-Field Maps (עריכה נתמכת בכל שלוש הרמות), לעולם לא ב-Survey123. תלויות: B2 (addRelatedFeature כשהאב הוא רשומת טבלה) ו-C2 (עריכה ב-Survey123 עם Repeat מקונן אינה נתמכת באפליקציית הווב ויש דיווחי תקלות ב-Inbox). אם C2 מכשיל את עריכת שלט קיים בסקר, מפצלים לשני סקרים: מיפוי ועריכת שלט ללא חזרה מקוננת, וביקור ליצירה בלבד. מגבלה ידועה (Field Maps): טופס רשומה מציג רמה אחת בלבד ואין בו הוספת רשומת בת, ולכן כל רכיב הוא טופס נפרד שנפתח מכפתור + בכרטיס הביקור הפתוח (בערך 3-4 הקשות לרכיב, ללא פתיחת הביקור מהרשימה). המשמעות: ביקור עם 0-1 רכיבים נוח ב-Field Maps, ופיקוח רחב על 2 רכיבים ומעלה קצר יותר ב-Survey123 (ליצירה בלבד). הערכת המאמץ המפורטת לכל תרחיש נמצאת בסימולטור."
    },
    {
      "id": "D26",
      "title": "ביקור ב-Survey123 כגיבוי לקליטה חלשה, מקושר מהפופאפ",
      "status": "open",
      "note": "כפתור שני בפופאפ \"ביקור ב-Survey123 (חיבור חלש)\" פותח את Survey123 על רשומת השלט בעריכה (itemID, action=edit, q:globalId, folder=inbox) ושם אפשר למלא ביקור ושורה לכל רכיב בטופס אחד, גם אופליין. פער: הוא דורש שהשלט כבר נמצא ב-Inbox (הורדה מראש) ושהמשתמש מחובר; לבדוק בשטח."
    },
    {
      "id": "D25",
      "title": "טבלת סיכום חזרות (Repeat) ב-Survey123 בעזרת join ו-note מחוץ ל-Repeat",
      "status": "open",
      "note": "בתוך כל Repeat (רכיבים וביקורים) שדה calculate שבונה שורת HTML: concat('<tr><td>',${ComponentType},'</td><td>',${PartStatusAtVisit},'</td></tr>'). מחוץ ל-Repeat ומתחתיו note שהתווית שלו: concat('<table>…<tr><th>…</th></tr>', join('', ${row_html}), '</table>'). הפונקציה join מחברת את כל החזרות ומתעדכנת בזמן המילוי. לבדוק ב-Connect שה-note מציג HTML ושטבלה נתמכת בגרסת האפליקציה בשטח; אם לא, גיבוי: שורות טקסט מופרדות ב-br. שדות העזר אינם נשמרים כשדות פיזיים (bind::esri:fieldType null)."
    },
    {
      "id": "D24",
      "title": "(הוחלף ב-D27) ביקור שמכסה כמה רכיבים: שורת ביקור לשלט ועוד שורה לכל רכיב",
      "status": "decided",
      "note": "הוחלף ב-D27: במקום שורה כללית ושורות רכיב באותה טבלה, שורת ביקור אחת ומתחתיה שורות מצב בטבלת בן. התיאור המקורי: ביקור פיקוח מתועד כשורה כללית אחת (ללא RelatedPartGlobalID: מצב שלט, סכנה, סיכום) ועוד שורה לכל רכיב שנבדק (RelatedPartGlobalID ו-PartStatusAtVisit). בפופאפ מופיעים לכל רכיב כפתורי ביקור. המבנה כבר מוגדר בסכימה: StatusAtVisit מוצג כשלא נבחר רכיב ו-PartStatusAtVisit כשנבחר. חסרון: לחיצה והמתנה לטופס לכל רכיב, ללא שמירה מרוכזת. הצעה לבחינה בשטח: להקל על ידי קישור חזרה לפופאפ אחרי כל שמירה (callback)."
    },
    {
      "id": "D23",
      "title": "תמונות דגמים: פריטי PNG ציבוריים ב-AGOL וטבלת עזר ModelImages עם קישור לכל דגם",
      "status": "decided",
      "note": "הקבצים מועלים כפריטי Image ב-AGOL ומשותפים לכולם. טבלה מתארחת אחת (ModelCode, ImageURL) מחזיקה את הקישורים, והפופאפ קורא אותה דרך $map (כמו ResponsibleLookup) ולכן אין קישורים קבועים בקוד ואפשר להחליף תמונה בלי לערוך Arcade. עלות: טבלה אחת נוספת, ללא קשר ל-GlobalID. חסרון: פריט ציבורי נגיש לכל מי שיש לו הקישור (התמונות הן איורי שילוט בלבד). ב-Survey123 נשארים קבצי media בתיקיית הטופס (media::image לא קורא מ-URL). נדרש לאחר מכן להוסיף את הטבלה למפה בשם \"תמונות דגמים\"."
    },
    {
      "id": "D22",
      "title": "ביקורים (מעקב / פיקוח / טיפול) מ-Field Maps ולא מ-Survey123, בתנאי שנבדק בשטח",
      "status": "open",
      "note": "המלצה: מיפוי שלט חדש נשאר ב-Survey123 (אוסף שלט, רכיבים וביקור ראשון ביחד ועובד אופליין). ביקור חוזר הוא שורה אחת בטבלה קשורה, ולכן מתאים ל-Field Maps: addRelatedFeature ממלא מראש סוג ביקור דרך featureAttributes, בעוד ש-Survey123 בעריכה אינו מאפשר למלא מראש שדה בשורת Repeat. יתרונות: צעד אחד פחות (ללא Inbox ומעבר אפליקציות), סוג הביקור מלא, והפופאפ הוא מרכז הפעולות. חסרונות: דיווח על כמה רכיבים דורש כמה שורות (לחיצה לכל רכיב), אין Repeat, וטופס Field Maps תלוי בתנאי תצוגה של הטבלה בלבד. פער ידוע: addRelatedFeature פונה לטבלה לפי relationshipID. נדרש מבחן בשטח לפני החלטה סופית. עודכן ב-D27: דיווח על כמה רכיבים הוא עכשיו שורות מצב תחת ביקור אחד, ולא שורות ביקור נפרדות."
    },
    {
      "id": "D21",
      "title": "תמונה לכל תת דגם: ממוזערת ברשימת הבחירה וגדולה לאישור אחרי הבחירה",
      "status": "open",
      "note": "ערך הדומיין SignSubModel מקבל שדה img. ב-Survey123 זה עמודת media::image בגיליון choices, והרשימה מוצגת ברשימת בחירה עם תמונות (ללא appearance=minimal, כי בתפריט נפתח אין תמונות). התמונה הגדולה אחרי הבחירה: note לכל דגם עם relevant על SignModel (מופק אוטומטית ביצירת הטופס). לבדיקה ב-Survey123 Connect: האם media::image ב-note תומך בביטוי דינמי, שיחליף 27 הערות בהערה אחת. בפופאפ: תמונה לפי ModelCode (Arcade). התמונות טיוטה מעמודי ספר השילוט, ויוחלפו בתמונות נקיות. לדגמים פ-3.1.1, פ-9.2 ופ-10.1 מהספר אין תמונה עד הכרעת הלקוח (שאלה 20)."
    },
    {
      "id": "D1",
      "title": "מאפיינים ורכיבים לפי דגם: כמות כנפיים, צירופים מותרים, פיקטוגרמות, שדות חובה",
      "status": "open",
      "note": "מחכה לקטלוג מאפייני_שלטים_30062026.xlsx"
    },
    {
      "id": "D2",
      "title": "מבנה וכלל הקצאת מספר שלט; תיאור שלט; שם ממפה; מקורות ואירועי מילוי של שדות אוטומטיים; שילוב נ״צ ידני עם GPS",
      "status": "open",
      "note": "המלצה: הקצאה בצד שרת (Notebook) אחרי סנכרון"
    },
    {
      "id": "D3",
      "title": "מקור ואירוע מילוי של תאריך הצבה וקדימות מול הזנה ידנית",
      "status": "open",
      "note": ""
    },
    {
      "id": "D4",
      "title": "תנאי זיהוי \"החלפה לתורת השילוט החדשה\" והקשר בין תקלות רכיב למצב השלט",
      "status": "open",
      "note": "שדה ReplacedToNewTheory מוצע זמנית"
    },
    {
      "id": "D5",
      "title": "קוד פ-4.1 כפול ושיוכי הסבה חריגים",
      "status": "open",
      "note": "קוד זמני P4.1-DUP"
    },
    {
      "id": "D6",
      "title": "מדד כיסוי והיקף הדשבורד (מכנה, אוכלוסיית ייחוס)",
      "status": "open",
      "note": ""
    },
    {
      "id": "D7",
      "title": "הסבת שכבה שטוחה קיימת (~8,000 רשומות) למבנה רלציוני",
      "status": "open",
      "note": "שלב הבא: Notebook להסבה"
    },
    {
      "id": "D8",
      "title": "סוגי ביקור: מעקב, פיקוח, טיפול. כל ביקור יוצר שורה חדשה",
      "status": "decided",
      "note": "הוחלט עם גיא"
    },
    {
      "id": "D9",
      "title": "תשתית ורכיבים בטבלה אחת (SignParts) עם סוג תשתית/רכיב; ללא קישור עצמי וללא טבלת תשתיות נפרדת",
      "status": "decided",
      "note": "כדי לצמצם טבלאות מקושרות ב-Survey123 / Field Maps. הוחלט עם גיא"
    },
    {
      "id": "D10",
      "title": "חלוקת שדות בין Signs ל-SignParts: זהות, מיקום, דגם, מצב כולל, שיוך יערני, QR ורכזים ב-Signs; מצב, תקלה, ספק והנפקה לכל רכיב ב-SignParts",
      "status": "decided",
      "note": "אפיון v0.2 אינו מחייב לגבי מבנה הנתונים (אישור גיא). מצב שלט כולל לא מחושב אוטומטית מרכיבים (סעיף 16 #4 עדיין פתוח). LastRepairDate נשאר ב-Signs כשדה לקריאה בלבד, מחושב מהביקור האחרון מסוג טיפול."
    },
    {
      "id": "D11",
      "title": "ערכים נגזרים מוצגים ב-Arcade בחלון הקופץ של השלט (Field Maps) ולא כשדות פיזיים",
      "status": "decided",
      "note": "שדות פיזיים רק למידע מקור שמעודכן בשטח, ובטבלה הנכונה (אינוונטר). הוסרו: LastRepairDate, SignDescription (Signs), DirectionCode, LevelCode (SignParts). הקוד הטכני נשלף מ-ext של הדומיין. ModelCode, QR נשארים עד הכרעה. ביטוי הפופאפ: kkl/arcade/popups/signage-sign-popup.arcade"
    },
    {
      "id": "D12",
      "title": "שאלת מיקום (geopoint עם מפה) בטופס; שדות הכתובת היערנית מחושבים ממנה",
      "status": "decided",
      "note": "Survey123: pulldata(\"@layer\") כשמחוברים לרשת. אין תמיכה במצב לא מקוון, ולכן בשטח ללא קליטה השדות נשארים ריקים ומושלמים בשרת אחרי הסנכרון (Notebook מתוזמן או כלל ייחוס). שכבת היערות ושדותיה (מרחב, אזור, גוש, יער, מספר, יחידה אחראית) טרם נמסרו; דרך ושם/צבע דרך לפי מרחק, כלל טרם הוגדר."
    },
    {
      "id": "D13",
      "title": "שדות קוד לממשקים מחושבים מבחירת הערך (ext בדומיין); מזהה שלט זמני נוצר בטופס",
      "status": "decided",
      "note": "ModelCode נגזר מ-SignModel דרך עמודת ext בבחירות הטופס (instance()), ללא שדה קלט נוסף. אותו מנגנון זמין לשדות נוספים (DirectionCode, LevelCode ברכיבים) אם ימסרו. SignID: הצעה SGN-yymmdd-NNNN בטופס; פורמט סופי טעון אישור."
    },
    {
      "id": "D14",
      "title": "כל מה שקשור לתקינות נקלט בביקור. בשלט נשאר עותק נוכחי של מצב השלט בלבד",
      "status": "decided",
      "note": "מצב שלט, סיווג בטיחותי, מהות תקלה ומצב רכיב נקלטים בשורות SignVisits. Signs.SignStatus/SafetyHazard/FaultNotes הם עותק נוכחי אוטומטי של שורת השלט האחרונה (נחוץ לצביעה במפה, לדוחות ולייצוא DATA). SignParts הוא מלאי בלבד (מה קיים), ואין בו מצב. מצב נוכחי של רכיב נגזר בפופאפ מהשורה האחרונה שדיווחה עליו."
    },
    {
      "id": "D15",
      "title": "שדות QR אינם מוצגים בסקר; נוצרים בשרת",
      "status": "open",
      "note": "שני השדות אוטומטיים לפי האפיון. פנימי: זיהוי יציב (מוצע מ-GlobalID). חיצוני: קישור למבקרים. לא מוצגים בסוקר, מוצגים בפופאפ. תבנית הקישור, כתובת בסיס ואירוע הפקה טרם נמסרו."
    },
    {
      "id": "D16",
      "title": "שדות חובה ורכיבים לפי דגם: הצעה עד השלמת הקטלוג",
      "status": "open",
      "note": "האפיון: רשימת שדות החובה והרכיבים לפי דגם יושלמו מהקטלוג (מאפייני_שלטים_30062026.xlsx). בינתיים מוצע חובה ב: משפחה, דגם, תמרור (בפ-11), סוג רכיב, סוג ביקור, מצב שלט בביקור (בשורת שלט), מצב רכיב בביקור (בשורת רכיב), סיווג בטיחותי (בלא תקין), מה נמצא / מה בוצע (בלא תקין, או ברכיב לא תקין/חסר), מיקום. כנף/כיוון/רמה רק לכנף בפ-6/7; פיקטוגרמה רק לרכיב פיקטוגרמה. סינון סוג רכיב לפי תת דגם דורש קטלוג: ערכי ComponentType יקבלו parent=תת דגם (choice_filter על שאלת הדגם)."
    },
    {
      "id": "D17",
      "title": "ביקור הוא שורה אחת לשלט; מצב רכיב הוא שורה בטבלת בן רק לרכיב שדווח; היעדר דיווח על רכיב = לא דווח",
      "status": "open",
      "note": "ביקור נושא מצב שלט וסיווג בטיחותי; שורת מצב רכיב (SignPartStatus, ראה D27) נושאת מצב רכיב. מיפוי חדש: נוצרת אוטומטית שורת ביקור ראשונה; האם גם רכיבים בעייתיים או מטופלים מקבלים שורת מצב כבר במיפוי טעון אישור. ביקור חוזר: שורה חדשה בכל ביקור. הכלל \"רכיב שלא דווח = לא דווח, לא תקין\" הוא הצעה לאישור הלקוח."
    },
    {
      "id": "D18",
      "title": "אחראים (רכזת קליטת קהל, רכז חניונים) נגזרים מטבלת עזר ולא נשמרים בשלט",
      "status": "open",
      "note": "השיוך הוא פונקציה של גיאוגרפיה ומשתנה עם אנשים, לכן טבלת ResponsibleLookup שמתוחזקת מרכזית, ושימוש בפופאפ, בדוחות ובדיוור. רמת המפתח טעונה אישור. שם הממפה הוא שדה בחירה מרשימה (Mapper) ולא Editor Tracking: ברירת מחדל לפי המשתמש המחובר, נעול בעריכה (ראו D20)."
    },
    {
      "id": "D20",
      "title": "שם הממפה: רשימת בחירה מהלקוח, ברירת מחדל לפי המשתמש המחובר, נעול בעריכה",
      "status": "open",
      "note": "Editor Tracking משקף מי שמר או ערך, לא מי מיפה (עורך שלט קיים ידרוס את Editor, ומשתמש טכני עלול ליצור). לכן שדה פיזי עם דומיין Mapper (ext = שם משתמש AGOL). ברירת מחדל: calculation עם once() מחפש ברשימה פריט שה-ext שלו הוא pulldata(@property, username). נעילה בעריכה: ביטוי בעמודת readonly, pulldata(@property, 'mode') = 'edit', שאינו נשמר בשדה ואינו בעמודת relevant (המלצת Esri). המצב מתייחס לרשומת האב בלבד, לכן מתאים לשדה בשלט ולא לשורת ביקור. הרשימה והתאמת שם המשתמש טעונות אספקת הלקוח."
    },
    {
      "id": "D19",
      "title": "ספק ופיקטוגרמה הם רשימות בחירה מתוחזקות; הערכים טרם נמסרו",
      "status": "open",
      "note": "Supplier: רשימה מתוחזקת, אין שמות ספקים באפיון. Pictogram: מהקטלוג ומסוננת לפי תת דגם (parent). שני הדומיינים ריקים עד קבלת הנתונים."
    }
  ],
  "diagrams": {
    "components": {
      "layers": [
        {
          "id": "users",
          "title": "משתמשים"
        },
        {
          "id": "apps",
          "title": "אפליקציות שטח"
        },
        {
          "id": "data",
          "title": "נתונים ועיבוד (AGOL)"
        },
        {
          "id": "out",
          "title": "צרכנים ומערכות חיצוניות"
        }
      ],
      "nodes": [
        {
          "id": "mgr",
          "layer": "users",
          "kind": "actor",
          "title": "הנהלת קליטת קהל, מנהלת שילוט והמסרה",
          "sub": "צרכני דוחות והתראות"
        },
        {
          "id": "coord",
          "layer": "users",
          "kind": "actor",
          "title": "רכזות קליטת קהל, רכזי חניונים, מהנדסי אזור",
          "sub": "צפייה ועריכה לפי הרשאות"
        },
        {
          "id": "contractor",
          "layer": "users",
          "kind": "actor",
          "title": "קבלן מבצע",
          "sub": "Mobile Worker, כ-10 משתמשים חיצוניים"
        },
        {
          "id": "s123",
          "layer": "apps",
          "kind": "app",
          "title": "טופס Survey123: סקר שילוט",
          "sub": "שלט חדש, ביקור חוזר, רכיבים בחזרות, חישובים ובדיקות חובה"
        },
        {
          "id": "fm",
          "layer": "apps",
          "kind": "app",
          "title": "מפת Field Maps",
          "sub": "איתור שלטים, פתיחת הטופס, פופאפ Arcade (מצב רכיב מהביקור האחרון, רכזת לפי אזור, QR)"
        },
        {
          "id": "forest",
          "layer": "data",
          "kind": "ext",
          "title": "שכבות יערות ודרכים",
          "sub": "מקור לכתובת יערנית ושם דרך; שם השכבה והשדות טרם נמסרו",
          "status": "open"
        },
        {
          "id": "hosted",
          "layer": "data",
          "kind": "data",
          "title": "Hosted Feature Layer: שילוט",
          "items": [
            "@entities",
            "@domains"
          ]
        },
        {
          "id": "nb",
          "layer": "data",
          "kind": "logic",
          "title": "ArcGIS Notebooks",
          "sub": "הסבה, בדיקות, יצירת QR בשרת (פתוח)",
          "status": "open"
        },
        {
          "id": "legacy",
          "layer": "data",
          "kind": "ext",
          "title": "שכבת שילוט קיימת (שטוחה)",
          "sub": "~8,000 שלטים, 15 סוגים ישנים"
        },
        {
          "id": "order",
          "layer": "out",
          "kind": "ext",
          "title": "מערכת הזמנת שילוט ושכבת DATA ארגונית",
          "sub": "שלב הבא; ממשק טרם הוגדר",
          "status": "planned"
        },
        {
          "id": "mail",
          "layer": "out",
          "kind": "report",
          "title": "התראות מייל",
          "sub": "שבועי: לא תקין. יומי: סכנה בטיחותית",
          "status": "planned"
        },
        {
          "id": "dash",
          "layer": "out",
          "kind": "report",
          "title": "דשבורד ודוחות",
          "sub": "יוגדר באפיון: כמות לפי דגם, לא תקין, לפירוק, כיסוי, סכנה בטיחותית",
          "status": "planned"
        }
      ],
      "edges": [
        {
          "from": "contractor",
          "to": "s123",
          "label": "ממלא"
        },
        {
          "from": "contractor",
          "to": "fm",
          "label": "מאתר"
        },
        {
          "from": "coord",
          "to": "fm",
          "label": "צופה ומעדכן"
        },
        {
          "from": "fm",
          "to": "s123",
          "label": "פותח טופס"
        },
        {
          "from": "s123",
          "to": "hosted",
          "label": "כותב (סנכרון)"
        },
        {
          "from": "forest",
          "to": "s123",
          "label": "pulldata (אונליין)",
          "status": "open"
        },
        {
          "from": "hosted",
          "to": "fm",
          "label": "קריאה ופופאפ"
        },
        {
          "from": "legacy",
          "to": "nb",
          "label": "ייצוא",
          "status": "open"
        },
        {
          "from": "nb",
          "to": "hosted",
          "label": "הסבה",
          "status": "open"
        },
        {
          "from": "hosted",
          "to": "dash",
          "label": "",
          "status": "planned"
        },
        {
          "from": "hosted",
          "to": "mail",
          "label": "",
          "status": "planned"
        },
        {
          "from": "hosted",
          "to": "order",
          "label": "",
          "status": "planned"
        }
      ]
    },
    "flows": [
      {
        "id": "new",
        "title": "מיפוי שלט חדש",
        "desc": "זרימת משתמש בשטח כשהשלט אינו קיים בשכבה.",
        "lanes": [
          {
            "id": "u",
            "label": "סוקר (קבלן / רכז)"
          },
          {
            "id": "s123",
            "label": "Survey123"
          },
          {
            "id": "db",
            "label": "שכבת נתונים (AGOL)"
          }
        ],
        "steps": [
          {
            "id": "n1",
            "lane": "u",
            "type": "start",
            "text": "מאתר בשטח שלט שאינו בשכבה",
            "next": [
              "n2"
            ]
          },
          {
            "id": "n2",
            "lane": "s123",
            "text": "פותח טופס חדש; מזהה שלט נוצר פעם אחת",
            "next": [
              "n3"
            ]
          },
          {
            "id": "n3",
            "lane": "u",
            "text": "מציב נקודה על המפה (GPS) ומתקן לפי הצורך",
            "next": [
              "n4"
            ]
          },
          {
            "id": "n4",
            "lane": "s123",
            "text": "מחשב כתובת יערנית (מרחב, אזור, גוש, יער, יחידה אחראית)",
            "note": "דורש קליטה. הדרישה קובעת עבודה ב-Offline, ולכן צריך להשלים בשרת (שאלה 19)",
            "status": "open",
            "next": [
              "n5"
            ]
          },
          {
            "id": "n5",
            "lane": "u",
            "text": "בוחר משפחת דגם, דגם ותמרור; ממלא תוכן, תיאור מיקום וצילום",
            "next": [
              "n6"
            ]
          },
          {
            "id": "n6",
            "lane": "s123",
            "text": "קוד דגם נגזר אוטומטית; ממפה הוא המשתמש המחובר (ניתן לשינוי)",
            "next": [
              "n7"
            ]
          },
          {
            "id": "n7",
            "lane": "u",
            "type": "decision",
            "text": "יש רכיבים לתעד?",
            "next": [
              {
                "to": "n8",
                "label": "כן"
              },
              {
                "to": "n9",
                "label": "לא"
              }
            ]
          },
          {
            "id": "n8",
            "lane": "u",
            "text": "מוסיף רכיבים בחזרה: סוג, כנף / כיוון / רמה, פיקטוגרמה, ספק",
            "next": [
              "n9"
            ]
          },
          {
            "id": "n9",
            "lane": "s123",
            "text": "אחרי השליחה Make יוצר שורת ביקור ראשונה מערכי השלט (מצב, סיווג, מה נמצא)",
            "next": [
              "n10"
            ],
            "note": "Make A (D28). מצב וסיווג נאספים בשדות השלט עצמו; סוג הביקור הראשון טעון אישור (מוצע: מעקב)",
            "status": "open"
          },
          {
            "id": "n10",
            "lane": "u",
            "type": "decision",
            "text": "מצב שלט לא תקין?",
            "next": [
              {
                "to": "n11",
                "label": "כן"
              },
              {
                "to": "n12",
                "label": "לא"
              }
            ]
          },
          {
            "id": "n11",
            "lane": "u",
            "text": "ממלא סיווג בטיחותי ומה נמצא (חובה)",
            "next": [
              "n12"
            ]
          },
          {
            "id": "n12",
            "lane": "u",
            "text": "שולח. ב-Offline נשמר בדואר יוצא עד סנכרון",
            "next": [
              "n13"
            ]
          },
          {
            "id": "n13",
            "lane": "db",
            "type": "data",
            "text": "נכתבים שלט, רכיבים וביקור",
            "ent": [
              "Signs",
              "SignParts",
              "SignVisits"
            ],
            "next": [
              "n14"
            ]
          },
          {
            "id": "n14",
            "lane": "db",
            "type": "end",
            "text": "השלט מופיע במפה; שורת הביקור הראשונה נוצרת תוך דקות (Make A)"
          }
        ]
      },
      {
        "id": "visit",
        "title": "ביקור חוזר בשלט קיים",
        "desc": "זרימת משתמש לביקור מעקב, פיקוח או טיפול. כל ביקור הוא שורה אחת, ומתחתיה שורת מצב רק לכל רכיב שנבדק.",
        "lanes": [
          {
            "id": "u",
            "label": "סוקר (קבלן / רכז)"
          },
          {
            "id": "fm",
            "label": "Field Maps"
          },
          {
            "id": "s123",
            "label": "Survey123"
          },
          {
            "id": "db",
            "label": "שכבת נתונים (AGOL)"
          }
        ],
        "steps": [
          {
            "id": "v1",
            "lane": "u",
            "type": "start",
            "text": "מאתר שלט קיים במפה",
            "next": [
              "v2"
            ]
          },
          {
            "id": "v2",
            "lane": "fm",
            "text": "פופאפ: מצב נוכחי, מצב כל רכיב מהביקור האחרון, רכזת לפי אזור",
            "next": [
              "v3"
            ]
          },
          {
            "id": "v3",
            "lane": "fm",
            "text": "לוחץ על קישור לעדכון; נפתח Survey123 בעריכה",
            "note": "לבדוק ב-Connect אם שורות ביקור קודמות נטענות בעריכה",
            "status": "open",
            "next": [
              "v4"
            ]
          },
          {
            "id": "v4",
            "lane": "s123",
            "text": "השלט נטען; ממפה ופרטי הזיהוי נעולים בעריכה",
            "next": [
              "v5"
            ]
          },
          {
            "id": "v5",
            "lane": "s123",
            "text": "נוצרת שורת ביקור חדשה: תאריך ומבקר אוטומטיים",
            "next": [
              "v6"
            ]
          },
          {
            "id": "v6",
            "lane": "u",
            "text": "בוחר סוג ביקור (מעקב / פיקוח / טיפול) ומצב שלט",
            "next": [
              "v7"
            ]
          },
          {
            "id": "v7",
            "lane": "u",
            "type": "decision",
            "text": "לא תקין?",
            "next": [
              {
                "to": "v8",
                "label": "כן"
              },
              {
                "to": "v9",
                "label": "לא"
              }
            ]
          },
          {
            "id": "v8",
            "lane": "u",
            "text": "ממלא סיווג בטיחותי ומה נמצא (חובה)",
            "next": [
              "v9"
            ]
          },
          {
            "id": "v9",
            "lane": "u",
            "type": "decision",
            "text": "יש מה לדווח על רכיב?",
            "next": [
              {
                "to": "v10",
                "label": "כן"
              },
              {
                "to": "v11",
                "label": "לא"
              }
            ]
          },
          {
            "id": "v10",
            "lane": "u",
            "text": "בתוך הביקור מוסיף שורת מצב רכיב (חזרה מקוננת): בוחר רכיב מרשימת רכיבי השלט ומדווח מצב",
            "next": [
              "v11"
            ],
            "note": "יצירה בלבד. תיקון בדיעבד ב-Field Maps. עריכת תגובה עם Repeat מקונן ב-Survey123 אינה נתמכת (בדיקה C2)",
            "status": "open"
          },
          {
            "id": "v11",
            "lane": "u",
            "text": "מעדכן נתוני שלט לפי הצורך וצילום, ושולח",
            "next": [
              "v12"
            ]
          },
          {
            "id": "v12",
            "lane": "db",
            "type": "data",
            "text": "נוספת שורת ביקור ושורות מצב לרכיבים שדווחו; תרחיש Make B מעתיק את המצב מהביקור האחרון לשלט (עיכוב של דקות)",
            "ent": [
              "SignVisits",
              "SignPartStatus",
              "Signs"
            ],
            "next": [
              "v13"
            ],
            "note": "D28: העדכון אינו מיידי ואינו תלוי בטופס עריכת האב",
            "status": "open"
          },
          {
            "id": "v13",
            "lane": "db",
            "type": "end",
            "text": "הפופאפ מציג את המצב המעודכן של השלט והרכיבים"
          }
        ]
      },
      {
        "id": "data",
        "title": "זרימת נתונים",
        "desc": "מאיפה נתונים נכנסים, איפה הם נשמרים ומי צורך אותם.",
        "lanes": [
          {
            "id": "src",
            "label": "מקורות"
          },
          {
            "id": "app",
            "label": "איסוף (Survey123)"
          },
          {
            "id": "db",
            "label": "שירות נתונים AGOL"
          },
          {
            "id": "proc",
            "label": "עיבוד ותצוגה"
          },
          {
            "id": "out",
            "label": "צרכנים"
          }
        ],
        "steps": [
          {
            "id": "d1",
            "lane": "src",
            "type": "start",
            "text": "נתוני שטח: GPS, תמונות, מצב שלט ורכיבים",
            "next": [
              "d2"
            ]
          },
          {
            "id": "d5",
            "lane": "src",
            "type": "start",
            "text": "שכבות יערות ודרכים (עיון)",
            "note": "שם ושדות טרם נמסרו",
            "status": "open",
            "next": [
              "d2"
            ]
          },
          {
            "id": "d2",
            "lane": "app",
            "text": "חישובים בטופס (מזהה, כתובת, קוד דגם) ובדיקות חובה",
            "next": [
              "d3"
            ]
          },
          {
            "id": "d3",
            "lane": "app",
            "text": "דואר יוצא במכשיר, סנכרון עם חזרת הקליטה",
            "next": [
              "d4"
            ]
          },
          {
            "id": "d4",
            "lane": "db",
            "type": "data",
            "text": "שלטים, רכיבים, ביקורים ומצבי רכיב (קשר לפי GlobalID)",
            "ent": [
              "Signs",
              "SignParts",
              "SignVisits",
              "SignPartStatus"
            ],
            "next": [
              "d6",
              "d8",
              "d9",
              "d10"
            ],
            "note": "עדכון שלט מביקור וביקור ראשון לשלט חדש: Make (D28)"
          },
          {
            "id": "d4b",
            "lane": "db",
            "type": "data",
            "text": "טבלת אחראים לפי אזור",
            "ent": [
              "ResponsibleLookup"
            ],
            "next": [
              "d6"
            ]
          },
          {
            "id": "d6",
            "lane": "proc",
            "text": "פופאפ Arcade: מצב רכיב מהביקור האחרון, רכזת לפי אזור",
            "next": [
              "d7"
            ]
          },
          {
            "id": "d7",
            "lane": "out",
            "type": "end",
            "text": "Field Maps: פופאפ השלט"
          },
          {
            "id": "d8",
            "lane": "out",
            "text": "דשבורד ודוחות",
            "status": "planned"
          },
          {
            "id": "d9",
            "lane": "out",
            "text": "התראות מייל שבועיות ויומיות",
            "status": "planned"
          },
          {
            "id": "d10",
            "lane": "out",
            "text": "הזמנת שילוט ושכבת DATA ארגונית",
            "status": "planned"
          }
        ]
      },
      {
        "id": "mig",
        "title": "הסבת השכבה הקיימת",
        "desc": "מהשכבה השטוחה למבנה הרלציוני. רוב השלבים תלויים בקבצים שטרם התקבלו מהלקוח.",
        "lanes": [
          {
            "id": "legacy",
            "label": "שכבה קיימת"
          },
          {
            "id": "client",
            "label": "הלקוח"
          },
          {
            "id": "nb",
            "label": "ArcGIS Notebook"
          },
          {
            "id": "new",
            "label": "מבנה חדש"
          }
        ],
        "steps": [
          {
            "id": "m1",
            "lane": "legacy",
            "type": "start",
            "text": "שכבה שטוחה: ~8,000 שלטים, 15 סוגים ישנים",
            "next": [
              "m2"
            ]
          },
          {
            "id": "m2",
            "lane": "nb",
            "text": "ייצוא וגיבוי לפני כל שינוי",
            "next": [
              "m3"
            ]
          },
          {
            "id": "m3",
            "lane": "client",
            "text": "טיוב ואישור התאמה בין סוג ישן לדגם חדש",
            "note": "אקסל המיפוי טרם התקבל",
            "status": "open",
            "next": [
              "m4"
            ]
          },
          {
            "id": "m4",
            "lane": "nb",
            "text": "יצירת שלט לכל רשומה והמרת סוג למשפחה ולדגם",
            "note": "סטטוס הסבה (MigrationStatus) פתוח",
            "status": "open",
            "next": [
              "m5",
              "m6"
            ]
          },
          {
            "id": "m5",
            "lane": "nb",
            "text": "רכיבים שניתן לגזור",
            "note": "תלוי בקטלוג הרכיבים",
            "status": "open",
            "next": [
              "m7"
            ]
          },
          {
            "id": "m6",
            "lane": "nb",
            "text": "מצב ותקלה קיימים לביקור פתיחה",
            "note": "סוג הביקור טעון אישור",
            "status": "open",
            "next": [
              "m7"
            ]
          },
          {
            "id": "m7",
            "lane": "nb",
            "text": "בדיקות: ספירות, שלטים ללא דגם, כפילויות",
            "next": [
              "m8"
            ]
          },
          {
            "id": "m8",
            "lane": "new",
            "type": "data",
            "text": "שלטים, רכיבים וביקורים",
            "ent": [
              "Signs",
              "SignParts",
              "SignVisits"
            ],
            "next": [
              "m9"
            ]
          },
          {
            "id": "m9",
            "lane": "new",
            "type": "end",
            "text": "מעבר לשכבה החדשה"
          }
        ]
      },
      {
        "id": "visitfm",
        "title": "ביקור מעקב / פיקוח / טיפול מ-Field Maps (חלופה מוצעת)",
        "desc": "אותו תרחיש ביקור בלי מעבר ל-Survey123: כפתור לכל סוג ביקור בפופאפ פותח טופס ביקור ב-Field Maps. מצב רכיב נוסף אחר כך מפופאפ הביקור, בכפתור + לכל רכיב, והרכיב ממולא מראש.",
        "lanes": [
          {
            "id": "u",
            "label": "סוקר (קבלן / רכז)"
          },
          {
            "id": "fm",
            "label": "Field Maps"
          },
          {
            "id": "db",
            "label": "שכבת נתונים (AGOL)"
          }
        ],
        "steps": [
          {
            "id": "f1",
            "lane": "u",
            "text": "מאתר שלט קיים במפה",
            "next": [
              "f2"
            ],
            "type": "start"
          },
          {
            "id": "f2",
            "lane": "fm",
            "text": "פופאפ השלט: מצב נוכחי (מצב רכיב מהשורה האחרונה), תמונת הדגם, רכיבים וביקורים עם מצבי הרכיבים שתחתיהם, ושלושה כפתורי ביקור",
            "next": [
              "f3"
            ]
          },
          {
            "id": "f3",
            "lane": "u",
            "text": "לוחץ על כפתור סוג הביקור: מעקב, פיקוח או טיפול",
            "next": [
              "f4"
            ]
          },
          {
            "id": "f4",
            "lane": "fm",
            "text": "נפתח טופס ביקור (רמה 2): סוג ביקור, מבקר ותאריך מלאים מראש",
            "next": [
              "f5"
            ],
            "note": "addRelatedFeature על Signs עם relationshipID ו-featureAttributes. לבדוק בשטח",
            "status": "open"
          },
          {
            "id": "f5",
            "lane": "u",
            "text": "מסמן מצב שלט. אם לא תקין: סיווג בטיחותי ומה נמצא (חובה). מצלם ושומר",
            "next": [
              "f6"
            ],
            "note": "ב-Field Maps טופס רשומה מציג רמה אחת בלבד ואין בו הוספת רשומת בת: מטופס הביקור אי אפשר להוסיף מצב רכיב. שומרים קודם את הביקור"
          },
          {
            "id": "f6",
            "lane": "db",
            "text": "נוספת שורת ביקור אחת; תרחיש Make B מעתיק ממנה את המצב לשלט (עיכוב של דקות)",
            "next": [
              "f7"
            ],
            "type": "data",
            "ent": [
              "SignVisits",
              "Signs"
            ],
            "note": "D28: Field Maps אינו מעדכן אב מבן. העיכוב לא נמדד",
            "status": "open"
          },
          {
            "id": "f7",
            "lane": "u",
            "text": "יש מה לדווח על רכיב?",
            "next": [
              {
                "to": "f8",
                "label": "כן"
              },
              {
                "to": "f11",
                "label": "לא"
              }
            ],
            "type": "decision"
          },
          {
            "id": "f8",
            "lane": "fm",
            "text": "חוזר אוטומטית לפופאפ השלט (callback). בפופאפ כרטיס \"ביקור פתוח להיום\": כל רכיבי השלט עם \"דווח\" או \"לא דווח\", וכפתור + ליד כל רכיב",
            "next": [
              "f9"
            ],
            "note": "Field Maps מציג טופס עריכה לרמה אחת ואין בו הוספת רשומת בת, לכן הדיווח על רכיב יוצא מהפופאפ. הקישור שיוצר את הביקור לא יכול להמשיך לטופס הרכיב כי מזהה הביקור לא ידוע בזמן בנייתו, ולכן הכרטיס נבנה ב-Arcade אחרי שהביקור קיים. כפתור + הוא addRelatedFeature שבו האב הוא רשומת ביקור (טבלה). בדיקה B2",
            "status": "open"
          },
          {
            "id": "f9",
            "lane": "u",
            "text": "לוחץ + ליד הרכיב: נפתח ישר טופס קצר (רמה 3) עם הרכיב ממולא מראש. בוחר מצב, מה נמצא, מצלם ושולח, וחוזר לאותו פופאפ",
            "next": [
              "f10"
            ],
            "note": "כל רכיב הוא טופס נפרד וחזרה לפופאפ השלט: בערך 3-4 הקשות לרכיב. ראה הערכת ההקשות בתרחישי הסימולטור"
          },
          {
            "id": "f10",
            "lane": "db",
            "text": "נוספת שורת מצב תחת הביקור הזה (רק לרכיב שדווח)",
            "next": [
              "f12"
            ],
            "type": "data",
            "ent": [
              "SignPartStatus"
            ]
          },
          {
            "id": "f12",
            "lane": "u",
            "text": "עוד רכיב?",
            "next": [
              {
                "to": "f8",
                "label": "כן, חוזר לפופאפ הביקור"
              },
              {
                "to": "f11",
                "label": "לא"
              }
            ],
            "type": "decision"
          },
          {
            "id": "f11",
            "lane": "db",
            "text": "הפופאפ מציג את הביקור עם מצבי הרכיבים שתחתיו ואת המצב המעודכן של השלט והרכיבים",
            "type": "end"
          }
        ]
      },
      {
        "id": "vscen1",
        "title": "תרחיש: פיקוח על שלט עם כמה רכיבים",
        "desc": "שלט עם כנפיים ופיקטוגרמה. הכול תקין חוץ מכנף אחת. ביקור אחד, ושורת מצב רק לרכיב שיש בו ממצא.",
        "lanes": [
          {
            "id": "u",
            "label": "סוקר (קבלן / רכז)"
          },
          {
            "id": "fm",
            "label": "Field Maps"
          },
          {
            "id": "db",
            "label": "שכבת נתונים (AGOL)"
          }
        ],
        "steps": [
          {
            "id": "a1",
            "lane": "u",
            "text": "פותח פופאפ של השלט ולוחץ פיקוח (כפתור כללי)",
            "next": [
              "a2"
            ],
            "type": "start"
          },
          {
            "id": "a2",
            "lane": "fm",
            "text": "נפתח טופס ביקור: מצב השלט, סכנה בטיחותית, סיכום וצילום",
            "next": [
              "a3"
            ]
          },
          {
            "id": "a3",
            "lane": "u",
            "text": "מסמן מצב לא תקין ושומר. אי אפשר להוסיף רכיבים מתוך טופס הביקור, לכן חוזר לפופאפ השלט",
            "next": [
              "a4"
            ],
            "note": "ב-Field Maps טופס רשומה מציג רמה אחת בלבד ואין בו הוספת רשומת בת"
          },
          {
            "id": "a4",
            "lane": "db",
            "text": "שורת ביקור אחת: פיקוח, מצב שלט = לא תקין",
            "next": [
              "a5"
            ],
            "type": "data",
            "ent": [
              "SignVisits"
            ]
          },
          {
            "id": "a5",
            "lane": "fm",
            "text": "פותח את הביקור שנשמר מרשימת הביקורים. פופאפ הביקור מציג את רכיבי השלט, כולם \"לא דווח\"",
            "next": [
              "a6"
            ]
          },
          {
            "id": "a6",
            "lane": "u",
            "text": "יש רכיב עם ממצא?",
            "next": [
              {
                "to": "a7",
                "label": "כן"
              },
              {
                "to": "a9",
                "label": "לא"
              }
            ],
            "type": "decision"
          },
          {
            "id": "a7",
            "lane": "u",
            "text": "לוחץ + ליד הכנף הפגועה: הרכיב כבר ממולא. בוחר לא תקין או חסר, מה נמצא, מצלם",
            "next": [
              "a8"
            ],
            "note": "לכל רכיב עם ממצא: +, מצב, הערה, שמירה. עם 3 רכיבים זה בערך 12 הקשות נוספות, ולכן ביקור רחב כדאי ב-Survey123"
          },
          {
            "id": "a8",
            "lane": "db",
            "text": "שורת מצב תחת הביקור: כנף, מצב רכיב = לא תקין",
            "next": [
              "a6"
            ],
            "type": "data",
            "ent": [
              "SignPartStatus"
            ]
          },
          {
            "id": "a9",
            "lane": "fm",
            "text": "רכיבים שלא דווחו נשארים \"לא דווח\" ולא נכתבות עבורם שורות. מספר הביקורים של השלט = שורות בטבלת הביקורים",
            "type": "end"
          }
        ]
      },
      {
        "id": "vscen2",
        "title": "תרחיש: ביקור מעקב שגרתי, הכול תקין",
        "desc": "המקרה הנפוץ: ביקור אחד, ללא שורות מצב רכיב. אין צורך לעבור על הרכיבים.",
        "lanes": [
          {
            "id": "u",
            "label": "סוקר (קבלן / רכז)"
          },
          {
            "id": "fm",
            "label": "Field Maps"
          },
          {
            "id": "db",
            "label": "שכבת נתונים (AGOL)"
          }
        ],
        "steps": [
          {
            "id": "b1",
            "lane": "u",
            "type": "start",
            "text": "פותח פופאפ ולוחץ מעקב",
            "next": [
              "b2"
            ]
          },
          {
            "id": "b2",
            "lane": "fm",
            "text": "טופס ביקור: מצב השלט, הערות וצילום",
            "next": [
              "b3"
            ]
          },
          {
            "id": "b3",
            "lane": "u",
            "text": "מאשר מצב תקין, מוסיף הערה אם צריך, שומר",
            "next": [
              "b4"
            ]
          },
          {
            "id": "b4",
            "lane": "db",
            "type": "data",
            "text": "שורת ביקור אחת, ללא שורות מצב רכיב. מצב נוכחי בשלט מתעדכן",
            "ent": [
              "SignVisits",
              "Signs"
            ],
            "next": [
              "b5"
            ]
          },
          {
            "id": "b5",
            "lane": "fm",
            "type": "end",
            "text": "סיום. ללא לחיצות על רכיבים"
          }
        ]
      },
      {
        "id": "vscen3",
        "title": "תרחיש: טיפול והחלפת רכיב",
        "desc": "קבלן מחליף כנף ומדווח. ביקור טיפול אחד ושורת מצב לכנף שהוחלפה.",
        "lanes": [
          {
            "id": "u",
            "label": "סוקר (קבלן / רכז)"
          },
          {
            "id": "fm",
            "label": "Field Maps"
          },
          {
            "id": "db",
            "label": "שכבת נתונים (AGOL)"
          }
        ],
        "steps": [
          {
            "id": "c1",
            "lane": "u",
            "text": "לוחץ טיפול בפופאפ של השלט",
            "next": [
              "c2"
            ],
            "type": "start"
          },
          {
            "id": "c2",
            "lane": "u",
            "text": "ממלא סיכום ומצב שלט אחרי הטיפול (תקין), שומר",
            "next": [
              "c3"
            ]
          },
          {
            "id": "c3",
            "lane": "db",
            "text": "שורת ביקור אחת: טיפול, מצב שלט = תקין",
            "next": [
              "c4"
            ],
            "type": "data",
            "ent": [
              "SignVisits",
              "Signs"
            ]
          },
          {
            "id": "c4",
            "lane": "u",
            "text": "בפופאפ הביקור לוחץ + ליד הכנף שהוחלפה: מצב רכיב = תקין, מה בוצע, צילום",
            "next": [
              "c5"
            ],
            "note": "ספק והנפקה מתעדכנים ברשומת הרכיב עצמו"
          },
          {
            "id": "c5",
            "lane": "db",
            "text": "שורת מצב תחת הביקור: כנף, תקין. פרטי ההנפקה מתעדכנים ברשומת הרכיב",
            "next": [
              "c6"
            ],
            "type": "data",
            "ent": [
              "SignPartStatus",
              "SignParts"
            ]
          },
          {
            "id": "c6",
            "lane": "fm",
            "text": "הכנף מוצגת בפופאפ כתקינה עם תאריך הטיפול",
            "type": "end"
          }
        ]
      },
      {
        "id": "vs123",
        "title": "ביקור ב-Survey123 בקליטה חלשה (גיבוי)",
        "desc": "כשאין קליטה יציבה: כפתור בפופאפ פותח את Survey123 על השלט. ב-Survey123 הביקור ומצבי הרכיבים נמלאים בטופס אחד (חזרה בתוך חזרה) ונשלחים יחד, גם מאוחר יותר מדואר יוצא. ליצירה בלבד: תיקון אחר כך ב-Field Maps.",
        "lanes": [
          {
            "id": "u",
            "label": "סוקר (קבלן / רכז)"
          },
          {
            "id": "fm",
            "label": "Field Maps"
          },
          {
            "id": "db",
            "label": "שכבת נתונים (AGOL)"
          }
        ],
        "steps": [
          {
            "id": "d1",
            "lane": "u",
            "type": "start",
            "text": "בפופאפ לוחץ \"ביקור ב-Survey123 (חיבור חלש)\"",
            "next": [
              "d2"
            ]
          },
          {
            "id": "d2",
            "lane": "fm",
            "text": "נפתח Survey123 על רשומת השלט (Inbox, edit). שאר העבודה אופליין",
            "note": "דורש שהשלט הורד ל-Inbox מראש כשהיתה קליטה",
            "status": "open",
            "next": [
              "d3"
            ]
          },
          {
            "id": "d3",
            "lane": "u",
            "text": "ממלא בטופס אחד: ביקור (סוג, מצב שלט, סיכום, צילום), ובתוכו שורת מצב לכל רכיב שנבדק (חזרה מקוננת). טבלת סיכום מציגה את השורות",
            "next": [
              "d4"
            ],
            "note": "יצירה בלבד. עריכת תגובה עם Repeat מקונן אינה נתמכת ב-Survey123, ולכן תיקון אחרי השליחה ב-Field Maps. לבדוק C1 ו-C2",
            "status": "open"
          },
          {
            "id": "d4",
            "lane": "u",
            "text": "שולח, או שומר בדואר יוצא ושולח כשחוזרת קליטה",
            "next": [
              "d5"
            ]
          },
          {
            "id": "d5",
            "lane": "db",
            "type": "data",
            "text": "נכתבים יחד: שורת ביקור ושורות מצב הרכיבים תחתיה",
            "ent": [
              "SignVisits",
              "SignPartStatus",
              "Signs"
            ],
            "next": [
              "d6"
            ]
          },
          {
            "id": "d6",
            "lane": "fm",
            "type": "end",
            "text": "הפופאפ מציג את הביקורים והמצב המעודכן"
          }
        ]
      }
    ]
  },
  "demo": {
    "_note": "נתוני דוגמה לסימולטור בלבד. לא נכתבים לשירות ולא משמשים להסבה.",
    "Signs": [
      {
        "MapperName": "משתמש דוגמה",
        "NewSignageTheory": "ערך דוגמה",
        "ReplacedToNewTheory": "כן",
        "MappingDate": "2026-06-10",
        "SignID": "SGN-260610-1001",
        "ModelFamily": "פ-6: שלט הכוונה (כנפיים)",
        "SignModel": "פ-6: שלט הכוונה (כנפיים)",
        "PlacementDate": "2026-05-20",
        "SignStatus": "מתוכנן",
        "SignContentText": "שביל הנוף · מעיין הצפירים · חניון המעיין",
        "LocationDescription": "צומת שבילים, 40 מ׳ מהחניון, בצד מזרח",
        "loc": {
          "x": 0.22,
          "y": 0.28
        }
      },
      {
        "MapperName": "משתמש דוגמה",
        "NewSignageTheory": "ערך דוגמה",
        "ReplacedToNewTheory": "לא",
        "MappingDate": "2026-06-10",
        "SignID": "SGN-260611-1002",
        "ModelFamily": "פ-3: שלט אתר",
        "SignModel": "פ-3.1: שלט אתר גדול עם שני נושאים",
        "SignStatus": "מתוכנן",
        "SignContentText": "אתר התצפית: שני נושאים, טבע ונוף",
        "LocationDescription": "מדרגה עליונה של התצפית, ליד המעקה",
        "loc": {
          "x": 0.68,
          "y": 0.22
        }
      },
      {
        "MapperName": "משתמש דוגמה",
        "NewSignageTheory": "ערך דוגמה",
        "ReplacedToNewTheory": "לא",
        "MappingDate": "2026-06-10",
        "SignID": "SGN-260612-1003",
        "ModelFamily": "פ-11: שלט תמרור",
        "SignModel": "פ-11: שלט תמרור על בסיס רשימת התמרורים",
        "TrafficSignType": "עצור",
        "SignStatus": "מתוכנן",
        "SignContentText": "תמרור עצור",
        "LocationDescription": "יציאה מדרך היער אל הכביש הראשי",
        "loc": {
          "x": 0.38,
          "y": 0.7
        }
      },
      {
        "MapperName": "משתמש דוגמה",
        "NewSignageTheory": "ערך דוגמה",
        "ReplacedToNewTheory": "לא",
        "MappingDate": "2026-06-10",
        "SignID": "SGN-260613-1004",
        "ModelFamily": "פ-5: שלט מידע",
        "SignModel": "פ-5.1: שלט מידע גדול / הוראות בטיחות והתנהגות (אנכי)",
        "SignStatus": "מתוכנן",
        "SignContentText": "הוראות בטיחות והתנהגות ביער",
        "LocationDescription": "כניסה לחניון, מול שער הכניסה",
        "loc": {
          "x": 0.8,
          "y": 0.62
        }
      },
      {
        "MapperName": "משתמש דוגמה",
        "NewSignageTheory": "ערך דוגמה",
        "ReplacedToNewTheory": "לא",
        "MappingDate": "2026-06-10",
        "SignID": "SGN-260614-1005",
        "ModelFamily": "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל",
        "SignModel": "פ-7: שלט הכוונה קטן לשבילי אופניים / הולכי רגל",
        "SignStatus": "מתוכנן",
        "SignContentText": "שביל אופניים, 3 ק״מ",
        "LocationDescription": "תחילת שביל האופניים הדרומי",
        "loc": {
          "x": 0.5,
          "y": 0.45
        }
      }
    ],
    "SignParts": [
      {
        "s": 0,
        "ComponentType": "עמוד"
      },
      {
        "s": 0,
        "ComponentType": "מסד"
      },
      {
        "s": 0,
        "ComponentType": "כנף",
        "WingNumber": 1,
        "Direction": "מזרח",
        "Level": "עליון",
        "SupplierName": "ספק דוגמה א׳",
        "IssueDate": "2026-05-18"
      },
      {
        "s": 0,
        "ComponentType": "כנף",
        "WingNumber": 2,
        "Direction": "מערב",
        "Level": "אמצעי",
        "SupplierName": "ספק דוגמה א׳",
        "IssueDate": "2026-05-18"
      },
      {
        "s": 0,
        "ComponentType": "פיקטוגרמה",
        "PictogramCode": "פיקטוגרמה דוגמה 1",
        "SupplierName": "ספק דוגמה ב׳",
        "IssueDate": "2026-05-18"
      },
      {
        "s": 1,
        "ComponentType": "לוח"
      },
      {
        "s": 1,
        "ComponentType": "עמוד"
      },
      {
        "s": 1,
        "ComponentType": "מסד"
      },
      {
        "s": 2,
        "ComponentType": "עמוד"
      },
      {
        "s": 2,
        "ComponentType": "לוח"
      },
      {
        "s": 3,
        "ComponentType": "לוח"
      },
      {
        "s": 3,
        "ComponentType": "מסד"
      },
      {
        "s": 3,
        "ComponentType": "אביזר",
        "ComponentNotes": "חבק עליון"
      },
      {
        "s": 4,
        "ComponentType": "עמוד"
      },
      {
        "s": 4,
        "ComponentType": "כנף",
        "WingNumber": 1,
        "Direction": "דרום",
        "Level": "עליון"
      },
      {
        "s": 4,
        "ComponentType": "פיקטוגרמה",
        "PictogramCode": "פיקטוגרמה דוגמה 2"
      }
    ],
    "SignVisits": [
      {
        "s": 0,
        "VisitDate": "2026-06-12",
        "VisitType": "מעקב",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "תקין",
        "VisitSummary": "ללא ממצאים"
      },
      {
        "s": 0,
        "VisitDate": "2026-08-03",
        "VisitType": "פיקוח",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "לא תקין",
        "SafetyHazardAtVisit": "סכנה בטיחותית",
        "VisitSummary": "כנף מזרחית רופפת ומסתובבת ברוח",
        "VisitNotes": "נדרש טיפול דחוף"
      },
      {
        "s": 0,
        "VisitDate": "2026-08-10",
        "VisitType": "טיפול",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "תקין",
        "VisitSummary": "הוחלף חבק והוחלפה הכנף המזרחית"
      },
      {
        "s": 1,
        "VisitDate": "2026-06-15",
        "VisitType": "מעקב",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "תקין"
      },
      {
        "s": 1,
        "VisitDate": "2026-09-02",
        "VisitType": "פיקוח",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "תקין",
        "VisitSummary": "נבדקו כל הרכיבים"
      },
      {
        "s": 2,
        "VisitDate": "2026-07-21",
        "VisitType": "פיקוח",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "לא תקין",
        "SafetyHazardAtVisit": "לא סכנה בטיחותית",
        "VisitSummary": "הלוח דהוי ובלתי קריא חלקית"
      },
      {
        "s": 3,
        "VisitDate": "2026-06-20",
        "VisitType": "מעקב",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "תקין",
        "VisitNotes": "צילום הוסף לתיק"
      },
      {
        "s": 4,
        "VisitDate": "2026-09-14",
        "VisitType": "מעקב",
        "VisitorName": "קבלן דוגמה א׳",
        "StatusAtVisit": "מתוכנן",
        "VisitSummary": "נקבע מועד התקנה"
      }
    ],
    "SignPartStatus": [
      {
        "v": 1,
        "p": 2,
        "PartStatusAtVisit": "לא תקין",
        "PartNotes": "הכנף רופפת, הבורג העליון חסר"
      },
      {
        "v": 1,
        "p": 1,
        "PartStatusAtVisit": "תקין"
      },
      {
        "v": 2,
        "p": 2,
        "PartStatusAtVisit": "תקין",
        "PartNotes": "הוחלפה כנף חדשה"
      },
      {
        "v": 2,
        "p": 4,
        "PartStatusAtVisit": "תקין"
      },
      {
        "v": 4,
        "p": 5,
        "PartStatusAtVisit": "תקין"
      },
      {
        "v": 4,
        "p": 6,
        "PartStatusAtVisit": "תקין"
      },
      {
        "v": 4,
        "p": 7,
        "PartStatusAtVisit": "תקין"
      },
      {
        "v": 5,
        "p": 9,
        "PartStatusAtVisit": "לא תקין",
        "PartNotes": "הדפסה דהויה, נדרש החלפת לוח"
      }
    ]
  }
};
window.__BUILT = "16.11.2026 10:28";
