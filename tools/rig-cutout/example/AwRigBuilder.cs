// Abbie's World: builds a bone-hierarchy prefab from rig.json (Unity 2021+). Not yet run in Unity: see the study page.
// Put this file in an Editor folder, copy rig.json and the sprites/ folder next to each other under Assets/, then use
// the menu Abbie's World > Build 2D Rig From rig.json. Bone GameObjects are named like the web rig (hips, spine, neck, head,
// upperarm_L/R, forearm_L/R, hand_L/R, thigh_L/R, shin_L/R, foot_L/R) so stock 2D clips that animate those paths apply.
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class AwRigBuilder
{
    [System.Serializable] class Bone { public string name; public string parent; public float[] pivot; public float[] tip; }
    [System.Serializable] class Part { public string name; public string bone; public int sorting; public string file; public int x, y, w, h; public bool decoration; }
    [System.Serializable] class RigFile { public Bone[] bones; public Part[] parts; }
    const float PPU = 100f;

    [MenuItem("Abbie's World/Build 2D Rig From rig.json")]
    public static void Build()
    {
        string json = EditorUtility.OpenFilePanel("rig.json", Application.dataPath, "json");
        if (string.IsNullOrEmpty(json)) return;
        BuildFrom(json);
    }

    public static void BuildFrom(string jsonPath)
    {
        var rig = JsonUtility.FromJson<RigFile>(File.ReadAllText(jsonPath));
        string dir = Path.GetDirectoryName(jsonPath).Replace("\\", "/");
        string assetDir = "Assets" + dir.Substring(Application.dataPath.Length);
        var root = new GameObject("AW_Hero");
        var bones = new Dictionary<string, Transform>();
        var pivots = new Dictionary<string, Vector2>();
        foreach (var b in rig.bones) pivots[b.name] = new Vector2(b.pivot[0], b.pivot[1]);
        // bones are listed parents first
        foreach (var b in rig.bones)
        {
            var go = new GameObject(b.name);
            bool hasParent = !string.IsNullOrEmpty(b.parent);
            go.transform.SetParent(hasParent ? bones[b.parent] : root.transform, false);
            Vector2 off = hasParent ? pivots[b.name] - pivots[b.parent] : Vector2.zero;
            go.transform.localPosition = new Vector3(off.x / PPU, -off.y / PPU, 0);   // image y runs down, Unity y up
            bones[b.name] = go.transform;
        }
        foreach (var p in rig.parts)
        {
            string tex = assetDir + "/" + p.file;
            var imp = AssetImporter.GetAtPath(tex) as TextureImporter;
            if (imp != null)
            {
                imp.textureType = TextureImporterType.Sprite;
                imp.spritePixelsPerUnit = PPU;
                var s = new TextureImporterSettings(); imp.ReadTextureSettings(s);
                s.spriteAlignment = (int)SpriteAlignment.TopLeft; s.spriteMeshType = SpriteMeshType.FullRect;
                imp.SetTextureSettings(s); imp.SaveAndReimport();
            }
            var go = new GameObject(p.name);
            go.transform.SetParent(bones[p.bone], false);
            Vector2 off = new Vector2(p.x, p.y) - pivots[p.bone];
            go.transform.localPosition = new Vector3(off.x / PPU, -off.y / PPU, 0);    // sprite pivot is its top-left corner
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = AssetDatabase.LoadAssetAtPath<Sprite>(tex);
            sr.sortingOrder = p.sorting;
        }
        root.AddComponent<Animator>();
        string prefab = assetDir + "/AW_Hero.prefab";
        PrefabUtility.SaveAsPrefabAssetAndConnect(root, prefab, InteractionMode.UserAction);
        Debug.Log("Built " + prefab + " with " + rig.bones.Length + " bones and " + rig.parts.Length + " sprite parts.");
    }
}
