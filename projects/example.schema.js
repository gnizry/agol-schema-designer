// פרויקט לדוגמה גנרי — מראה את מבנה הקובץ. סכמות אמיתיות נשמרות בריפו פרטי נפרד.
window.SCHEMAS = window.SCHEMAS || {};
window.SCHEMAS["example"] = {
  "meta": {
    "key": "example",
    "project": "Example",
    "title": "דוגמה — נכסים וביקורות",
    "version": 1,
    "spatialRef": 2039,
    "spatialRefName": "Israel TM Grid (ITM)",
    "source": "פרויקט לדוגמה גנרי (ללא נתוני ארגון)",
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
    "AssetType": {
      "name": "AssetType",
      "desc": "סוג נכס",
      "fieldType": "TEXT",
      "values": [
        {
          "code": "סוג א",
          "label": "סוג א",
          "parent": ""
        },
        {
          "code": "סוג ב",
          "label": "סוג ב",
          "parent": ""
        },
        {
          "code": "סוג ג",
          "label": "סוג ג",
          "parent": ""
        }
      ]
    },
    "Condition": {
      "name": "Condition",
      "desc": "מצב",
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
        }
      ]
    }
  },
  "entities": [
    {
      "name": "Assets",
      "alias": "נכסים",
      "kind": "point",
      "attachments": true,
      "editorTracking": true,
      "description": "שכבת נקודות לדוגמה.",
      "fields": [
        {
          "category": "זיהוי",
          "name": "AssetID",
          "alias": "מזהה נכס",
          "type": "TEXT",
          "length": "255",
          "domain": "",
          "mode": "אוטומטי",
          "visible": "קריאה בלבד",
          "open": false,
          "note": ""
        },
        {
          "category": "סיווג",
          "name": "AssetType",
          "alias": "סוג נכס",
          "type": "TEXT",
          "length": "255",
          "domain": "AssetType",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "note": ""
        },
        {
          "category": "מצב",
          "name": "Condition",
          "alias": "מצב",
          "type": "TEXT",
          "length": "255",
          "domain": "Condition",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "note": ""
        },
        {
          "category": "מצב",
          "name": "RequiresRepair",
          "alias": "דורש תיקון",
          "type": "TEXT",
          "length": "255",
          "domain": "YesNo",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "note": ""
        },
        {
          "category": "מצב",
          "name": "Notes",
          "alias": "הערות",
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
      "name": "Inspections",
      "alias": "ביקורות",
      "kind": "table",
      "attachments": true,
      "editorTracking": true,
      "description": "יומן ביקורות 1:N לנכס.",
      "fields": [
        {
          "category": "קשר",
          "name": "ParentGlobalID",
          "alias": "מזהה נכס אב",
          "type": "GUID",
          "length": "",
          "domain": "",
          "mode": "מערכת",
          "visible": "מוסתר",
          "open": false,
          "note": ""
        },
        {
          "category": "ביקורת",
          "name": "InspectionDate",
          "alias": "תאריך ביקורת",
          "type": "DATE",
          "length": "",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": ""
        },
        {
          "category": "ביקורת",
          "name": "ConditionAtInspection",
          "alias": "מצב בעת הביקורת",
          "type": "TEXT",
          "length": "255",
          "domain": "Condition",
          "mode": "רשימה",
          "visible": "תמיד",
          "open": false,
          "note": ""
        },
        {
          "category": "ביקורת",
          "name": "Notes",
          "alias": "הערות",
          "type": "TEXT",
          "length": "1000",
          "domain": "",
          "mode": "ידני",
          "visible": "תמיד",
          "open": false,
          "note": ""
        }
      ]
    }
  ],
  "relationships": [
    {
      "name": "Assets_Inspections",
      "origin": "Assets",
      "destination": "Inspections",
      "originKey": "GlobalID",
      "destKey": "ParentGlobalID",
      "type": "SIMPLE",
      "forward": "ביקורות",
      "backward": "נכס"
    }
  ],
  "decisions": []
};
