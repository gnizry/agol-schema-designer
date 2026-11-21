# -*- coding: utf-8 -*-
"""
נוצר אוטומטית מהכלי "מעצב סכמת AGOL" — דוגמה — נכסים וביקורות
מקור: projects/example.schema.js   (אל תערכו ידנית; ערכו בכלי וייצאו מחדש)

הרצה: ArcGIS Pro > Analysis > Python — הדביקו והקישו Enter.
לאחר מכן: Share As Web Layer (Hosted Feature Layer + טבלאות), הפעלת Sync (Offline),
ובהגדרות השירות ב-AGOL: Editor Tracking, Delete Protection, Attachments.
הערה: Contingent Values (משפחה → תת-דגם) אינם נוצרים כאן; הסינון ייעשה ב-Survey123 (choice_filter).
"""

import arcpy

arcpy.env.overwriteOutput = True
REBUILD = True            # True: מוחק ובונה מחדש ישויות וקשרים קיימים באותו שם (לא נוגע בדומיינים)
SPATIAL_REF = 2039      # Israel TM Grid (ITM)

try:
    aprx = arcpy.mp.ArcGISProject("CURRENT")
    gdb = aprx.defaultGeodatabase
except Exception:
    aprx = None
    gdb = arcpy.env.scratchGDB
print("[+] Geodatabase:", gdb)

# ---------------------------------------------------------------- דומיינים
DOMAINS = {
    "YesNo": {"desc": "כן / לא", "type": "TEXT", "values": [
        ("כן", "כן"),
        ("לא", "לא"),
    ]},
    "AssetType": {"desc": "סוג נכס", "type": "TEXT", "values": [
        ("סוג א", "סוג א"),
        ("סוג ב", "סוג ב"),
        ("סוג ג", "סוג ג"),
    ]},
    "Condition": {"desc": "מצב", "type": "TEXT", "values": [
        ("תקין", "תקין"),
        ("לא תקין", "לא תקין"),
    ]},
}

# ---------------------------------------------------------------- ישויות
ENTITIES = [
    {"name": "Assets", "alias": "נכסים", "kind": "POINT", "attachments": True, "editor_tracking": True, "fields": [
        {"name": "AssetID", "alias": "מזהה נכס", "type": "TEXT", "length": 255, "domain": None},
        {"name": "AssetType", "alias": "סוג נכס", "type": "TEXT", "length": 255, "domain": "AssetType"},
        {"name": "Condition", "alias": "מצב", "type": "TEXT", "length": 255, "domain": "Condition"},
        {"name": "RequiresRepair", "alias": "דורש תיקון", "type": "TEXT", "length": 255, "domain": "YesNo"},
        {"name": "Notes", "alias": "הערות", "type": "TEXT", "length": 1000, "domain": None},
    ]},
    {"name": "Inspections", "alias": "ביקורות", "kind": "TABLE", "attachments": True, "editor_tracking": True, "fields": [
        {"name": "ParentGlobalID", "alias": "מזהה נכס אב", "type": "GUID", "length": None, "domain": None},
        {"name": "InspectionDate", "alias": "תאריך ביקורת", "type": "DATE", "length": None, "domain": None},
        {"name": "ConditionAtInspection", "alias": "מצב בעת הביקורת", "type": "TEXT", "length": 255, "domain": "Condition"},
        {"name": "Notes", "alias": "הערות", "type": "TEXT", "length": 1000, "domain": None},
    ]},
]

# ---------------------------------------------------------------- קשרים
RELATIONSHIPS = [
    {"name": "Assets_Inspections", "origin": "Assets", "dest": "Inspections", "pk": "GlobalID", "fk": "ParentGlobalID", "type": "SIMPLE", "fwd": "ביקורות", "bwd": "נכס"},
]


print("=" * 60)
print("[1/4] דומיינים")
print("=" * 60)
existing = [d.name for d in arcpy.da.ListDomains(gdb)]
for dname, d in DOMAINS.items():
    if dname not in existing:
        arcpy.management.CreateDomain(gdb, dname, d["desc"], d["type"], "CODED")
        print("  + domain:", dname)
    for code, label in d["values"]:
        try:
            arcpy.management.AddCodedValueToDomain(gdb, dname, code, label)
        except Exception:
            pass  # הערך כבר קיים

print("=" * 60)
print("[2/4] ישויות ושדות")
print("=" * 60)
sr = arcpy.SpatialReference(SPATIAL_REF)

if REBUILD:
    for r in RELATIONSHIPS:
        rc = gdb + "/" + r["name"]
        if arcpy.Exists(rc):
            arcpy.management.Delete(rc)

for ent in ENTITIES:
    path = gdb + "/" + ent["name"]
    if arcpy.Exists(path):
        if REBUILD:
            arcpy.management.Delete(path)
        else:
            print("  = קיים, מדלג:", ent["name"])
            continue
    if ent["kind"] in ("POINT", "POLYLINE", "POLYGON"):
        arcpy.management.CreateFeatureclass(gdb, ent["name"], ent["kind"], spatial_reference=sr, has_m="DISABLED", has_z="DISABLED")
    else:
        arcpy.management.CreateTable(gdb, ent["name"])
    try:
        arcpy.AlterAliasName(path, ent["alias"])
    except Exception as e:
        print("  [i] alias לישות לא הוגדר:", e)
    for f in ent["fields"]:
        arcpy.management.AddField(
            in_table=path, field_name=f["name"], field_type=f["type"],
            field_length=f["length"], field_alias=f["alias"], field_domain=f["domain"] or ""
        )
    arcpy.management.AddGlobalIDs(path)
    if ent["attachments"]:
        arcpy.management.EnableAttachments(path)
    if ent["editor_tracking"]:
        arcpy.management.EnableEditorTracking(
            in_dataset=path, creator_field="Creator", creation_date_field="CreationDate",
            last_editor_field="Editor", last_edit_date_field="EditDate",
            add_fields="ADD_FIELDS", record_dates_in="UTC"
        )
    print("  + %s (%d שדות)" % (ent["name"], len(ent["fields"])))

print("=" * 60)
print("[3/4] קשרים (Relationship Classes)")
print("=" * 60)
for r in RELATIONSHIPS:
    arcpy.management.CreateRelationshipClass(
        origin_table=gdb + "/" + r["origin"], destination_table=gdb + "/" + r["dest"],
        out_relationship_class=gdb + "/" + r["name"], relationship_type=r["type"],
        forward_label=r["fwd"], backward_label=r["bwd"], message_direction="NONE",
        cardinality="ONE_TO_MANY", attributed="NONE",
        origin_primary_key=r["pk"], origin_foreign_key=r["fk"]
    )
    print("  + %s: %s 1:N %s" % (r["name"], r["origin"], r["dest"]))

print("=" * 60)
print("[4/4] הוספה למפה")
print("=" * 60)
try:
    m = aprx.activeMap
    for ent in ENTITIES:
        m.addDataFromPath(gdb + "/" + ent["name"])
    print("  נוספו למפה הפעילה")
except Exception as e:
    print("  [i] לא נוספו למפה:", e)

print("\n>>> הסתיים. המשך: Share As Web Layer.")
