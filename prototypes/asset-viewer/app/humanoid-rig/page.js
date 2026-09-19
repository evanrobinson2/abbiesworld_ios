'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const PART_ORDER = [
  'hair_back',
  'thigh_left', 'shin_left', 'foot_left',
  'thigh_right', 'shin_right', 'foot_right',
  'upper_arm_left', 'forearm_left', 'hand_left',
  'upper_arm_right', 'forearm_right', 'hand_right',
  'pelvis', 'torso', 'head', 'hair_front'
];

const AVAILABLE_ANIMATIONS = ['neutral', 'idle', 'walk', 'run'];

const SKELETON = {
  root: { parent: null, children: ['pelvis'] },
  pelvis: { parent: 'root', children: ['torso', 'thigh_left', 'thigh_right'] },
  torso: { parent: 'pelvis', children: ['head', 'upper_arm_left', 'upper_arm_right'] },
  head: { parent: 'torso', children: ['hair_back', 'hair_front'] },
  hair_back: { parent: 'head', children: [] },
  hair_front: { parent: 'head', children: [] },
  upper_arm_left: { parent: 'torso', children: ['forearm_left'] },
  forearm_left: { parent: 'upper_arm_left', children: ['hand_left'] },
  hand_left: { parent: 'forearm_left', children: [] },
  upper_arm_right: { parent: 'torso', children: ['forearm_right'] },
  forearm_right: { parent: 'upper_arm_right', children: ['hand_right'] },
  hand_right: { parent: 'forearm_right', children: [] },
  thigh_left: { parent: 'pelvis', children: ['shin_left'] },
  shin_left: { parent: 'thigh_left', children: ['foot_left'] },
  foot_left: { parent: 'shin_left', children: [] },
  thigh_right: { parent: 'pelvis', children: ['shin_right'] },
  shin_right: { parent: 'thigh_right', children: ['foot_right'] },
  foot_right: { parent: 'shin_right', children: [] },
};

const PART_PIVOTS = {
  head: { x: 0.5, y: 0.85 },
  hair_back: { x: 0.5, y: 0.8 },
  hair_front: { x: 0.5, y: 0.8 },
  torso: { x: 0.5, y: 0.15 },
  pelvis: { x: 0.5, y: 0.3 },
  upper_arm_left: { x: 0.5, y: 0.12 },
  forearm_left: { x: 0.5, y: 0.12 },
  hand_left: { x: 0.5, y: 0.15 },
  upper_arm_right: { x: 0.5, y: 0.12 },
  forearm_right: { x: 0.5, y: 0.12 },
  hand_right: { x: 0.5, y: 0.15 },
  thigh_left: { x: 0.5, y: 0.12 },
  shin_left: { x: 0.5, y: 0.12 },
  foot_left: { x: 0.3, y: 0.2 },
  thigh_right: { x: 0.5, y: 0.12 },
  shin_right: { x: 0.5, y: 0.12 },
  foot_right: { x: 0.7, y: 0.2 },
};

const PART_POSITIONS = {
  pelvis: { x: 300, y: 280 },
  torso: { x: 300, y: 200 },
  head: { x: 300, y: 100 },
  hair_back: { x: 300, y: 60 },
  hair_front: { x: 300, y: 70 },
  upper_arm_left: { x: 230, y: 180 },
  forearm_left: { x: 200, y: 250 },
  hand_left: { x: 180, y: 320 },
  upper_arm_right: { x: 370, y: 180 },
  forearm_right: { x: 400, y: 250 },
  hand_right: { x: 420, y: 320 },
  thigh_left: { x: 270, y: 340 },
  shin_left: { x: 260, y: 420 },
  foot_left: { x: 250, y: 490 },
  thigh_right: { x: 330, y: 340 },
  shin_right: { x: 340, y: 420 },
  foot_right: { x: 350, y: 490 },
};

function interpolateKeyframes(keyframes, time, duration) {
  const t = (time % duration) / duration * duration;
  
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (t >= k1.time && t < k2.time) {
      const progress = (t - k1.time) / (k2.time - k1.time);
      const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      return k1.value + (k2.value - k1.value) * eased;
    }
  }
  return keyframes[keyframes.length - 1].value;
}

export default function HumanoidRigPage() {
  const canvasRef = useRef(null);
  const [parts, setParts] = useState({});
  const [rigSpec, setRigSpec] = useState(null);
  const [animation, setAnimation] = useState('neutral');
  const [animData, setAnimData] = useState({ idle: null, walk: null });
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [characterId, setCharacterId] = useState('test-001');
  const availableCharacters = ['test-001', 'explorer-003', 'explorer-002', 'explorer-001'];
  const [view, setView] = useState('preview');
  const [templateImage, setTemplateImage] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetch('/humanoid-rig/rig-spec.json')
      .then(r => r.ok ? r.json() : null)
      .then(setRigSpec)
      .catch(() => {});

    fetch('/humanoid-rig/animations/idle.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => setAnimData(prev => ({ ...prev, idle: data })))
      .catch(() => {});

    fetch('/humanoid-rig/animations/walk.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => setAnimData(prev => ({ ...prev, walk: data })))
      .catch(() => {});

    fetch('/humanoid-rig/animations/run.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => setAnimData(prev => ({ ...prev, run: data })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    Promise.all([
      loadImage('/humanoid-rig/templates/construction-template.png'),
      loadImage('/humanoid-rig/templates/exploded-sheet.png'),
    ]).then(([template, exploded]) => {
      setTemplateImage(template || exploded);
    });
  }, []);

  useEffect(() => {
    const loadParts = async () => {
      const loaded = {};
      for (const partId of PART_ORDER) {
        const img = new Image();
        img.src = `/humanoid-rig/characters/${characterId}/parts/${partId}.png`;
        await new Promise((resolve) => {
          img.onload = () => {
            loaded[partId] = img;
            resolve();
          };
          img.onerror = resolve;
        });
      }
      setParts(loaded);
    };
    loadParts();
  }, [characterId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentAnim = animation !== 'neutral' ? animData[animation] : null;
      const boneRotations = {};
      const boneTranslations = {};

      if (currentAnim) {
        for (const [track, data] of Object.entries(currentAnim.tracks || {})) {
          const [bone, prop] = track.split('.');
          const value = interpolateKeyframes(data.keyframes, elapsed, currentAnim.duration);
          
          if (prop === 'rotation') {
            boneRotations[bone] = (value * Math.PI) / 180;
          } else if (prop === 'y') {
            boneTranslations[bone] = { y: value };
          } else if (prop === 'scaleY') {
            boneTranslations[bone] = { ...(boneTranslations[bone] || {}), scaleY: value };
          }
        }
      }

      const scale = 0.4;
      const offsetX = canvas.width / 2 - 100;
      const offsetY = 50;

      const rootY = boneTranslations.root?.y || 0;

      for (const partId of PART_ORDER) {
        const img = parts[partId];
        if (!img) continue;

        const pos = PART_POSITIONS[partId];
        const pivot = PART_PIVOTS[partId];
        
        let totalRotation = 0;
        let bone = partId;
        while (bone && SKELETON[bone]) {
          totalRotation += boneRotations[bone] || 0;
          bone = SKELETON[bone].parent;
        }

        ctx.save();
        
        const drawX = pos.x * scale + offsetX;
        const drawY = pos.y * scale + offsetY + rootY * scale;
        
        ctx.translate(drawX, drawY);
        ctx.rotate(totalRotation);

        const imgW = img.width * scale * 0.5;
        const imgH = img.height * scale * 0.5;
        const pivotOffsetX = -imgW * pivot.x;
        const pivotOffsetY = -imgH * pivot.y;

        ctx.drawImage(img, pivotOffsetX, pivotOffsetY, imgW, imgH);

        if (showSkeleton) {
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (showSkeleton) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        for (const partId of Object.keys(SKELETON)) {
          if (partId === 'root') continue;
          const pos = PART_POSITIONS[partId];
          const parent = SKELETON[partId].parent;
          if (parent && parent !== 'root' && PART_POSITIONS[parent]) {
            const parentPos = PART_POSITIONS[parent];
            ctx.beginPath();
            ctx.moveTo(pos.x * scale + offsetX, pos.y * scale + offsetY);
            ctx.lineTo(parentPos.x * scale + offsetX, parentPos.y * scale + offsetY);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [parts, animation, animData, showSkeleton]);

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>← Back to Asset Browser</Link>
      </div>

      <h1 style={{ margin: '0 0 10px' }}>Humanoid Rig POC</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Reference-conditioned 2D puppet generation experiment
      </p>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {['preview', 'template', 'parts', 'motion'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '8px 16px',
              background: view === v ? '#333' : '#eee',
              color: view === v ? '#fff' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {v === 'motion' ? 'Motion Diagnostics' : v}
          </button>
        ))}
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 14, color: '#666' }}>Character:</label>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid #ccc',
              fontSize: 14,
            }}
          >
            {availableCharacters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {view === 'preview' && (
        <div style={{ display: 'flex', gap: 40 }}>
          <div>
            <canvas
              ref={canvasRef}
              width={400}
              height={500}
              style={{ border: '2px solid #ddd', borderRadius: 8 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Character ID
              </label>
              <input
                type="text"
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  width: 200,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Animation
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {AVAILABLE_ANIMATIONS.map((anim) => (
                  <button
                    key={anim}
                    onClick={() => {
                      setAnimation(anim);
                      startTimeRef.current = null;
                    }}
                    style={{
                      padding: '8px 16px',
                      background: animation === anim ? '#4a9eff' : '#eee',
                      color: animation === anim ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {anim}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showSkeleton}
                  onChange={(e) => setShowSkeleton(e.target.checked)}
                />
                Show Skeleton Overlay
              </label>
            </div>

            <div style={{ marginTop: 20 }}>
              <h3 style={{ margin: '0 0 10px' }}>Loaded Parts</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {PART_ORDER.map((partId) => (
                  <span
                    key={partId}
                    style={{
                      padding: '2px 8px',
                      background: parts[partId] ? '#d4edda' : '#f8d7da',
                      color: parts[partId] ? '#155724' : '#721c24',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    {partId}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'template' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h3>Construction Template</h3>
            {templateImage ? (
              <img
                src="/humanoid-rig/templates/construction-template.png"
                alt="Construction template"
                style={{ maxWidth: 400, border: '1px solid #ddd' }}
              />
            ) : (
              <p style={{ color: '#999' }}>Template not found</p>
            )}
          </div>
          <div>
            <h3>Exploded Sheet</h3>
            <img
              src="/humanoid-rig/templates/exploded-sheet.png"
              alt="Exploded sheet"
              style={{ maxWidth: 400, border: '1px solid #ddd' }}
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>
      )}

      {view === 'parts' && (
        <div>
          <h3>Extracted Parts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {PART_ORDER.map((partId) => (
              <div
                key={partId}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 10,
                  textAlign: 'center',
                  background: parts[partId] ? '#fff' : '#fafafa',
                }}
              >
                {parts[partId] ? (
                  <img
                    src={`/humanoid-rig/characters/${characterId}/parts/${partId}.png`}
                    alt={partId}
                    style={{ maxWidth: 100, maxHeight: 100 }}
                  />
                ) : (
                  <div style={{ width: 100, height: 100, background: '#eee', margin: '0 auto' }} />
                )}
                <div style={{ fontSize: 11, marginTop: 5, color: '#666' }}>{partId}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'motion' && (
        <div>
          <h3>Motion Diagnostics</h3>
          <p style={{ color: '#666', marginBottom: 20 }}>
            Animation data overview and keyframe visualization
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {AVAILABLE_ANIMATIONS.filter(a => a !== 'neutral').map((animName) => {
              const anim = animData[animName];
              if (!anim) return (
                <div key={animName} style={{ padding: 15, background: '#f5f5f5', borderRadius: 8 }}>
                  <h4 style={{ margin: 0, textTransform: 'capitalize' }}>{animName}</h4>
                  <p style={{ color: '#999', margin: '10px 0 0' }}>Not loaded</p>
                </div>
              );

              const trackCount = Object.keys(anim.tracks || {}).length;
              const keyframeCount = Object.values(anim.tracks || {}).reduce(
                (sum, t) => sum + (t.keyframes?.length || 0), 0
              );

              return (
                <div key={animName} style={{ padding: 15, background: '#f5f5f5', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', textTransform: 'capitalize' }}>{animName}</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, fontSize: 13 }}>
                    <span style={{ color: '#666' }}>Duration:</span>
                    <span>{anim.duration}s</span>
                    <span style={{ color: '#666' }}>Loop:</span>
                    <span>{anim.loop ? 'Yes' : 'No'}</span>
                    <span style={{ color: '#666' }}>Tracks:</span>
                    <span>{trackCount}</span>
                    <span style={{ color: '#666' }}>Keyframes:</span>
                    <span>{keyframeCount}</span>
                    <span style={{ color: '#666' }}>Source:</span>
                    <span>{anim.provenance?.source || 'unknown'}</span>
                  </div>

                  <div style={{ marginTop: 15 }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Tracks</div>
                    <div style={{ maxHeight: 150, overflow: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
                      {Object.entries(anim.tracks || {}).map(([track, data]) => (
                        <div key={track} style={{ 
                          padding: '2px 5px', 
                          background: '#fff', 
                          marginBottom: 2,
                          borderRadius: 3,
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>{track}</span>
                          <span style={{ color: '#888' }}>{data.keyframes?.length || 0} kf</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAnimation(animName);
                      setView('preview');
                      startTimeRef.current = null;
                    }}
                    style={{
                      marginTop: 10,
                      padding: '6px 12px',
                      background: '#4a9eff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Play
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 30 }}>
            <h4>Motion Import Pipeline</h4>
            <p style={{ color: '#666', fontSize: 14 }}>
              The animation system supports importing standard humanoid motion from FBX/BVH files
              (Mixamo, Rokoko, etc.) and converting them to our canonical format.
            </p>
            <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 15, borderRadius: 4, overflow: 'auto', fontSize: 12 }}>
{`# Import motion from FBX file (requires Blender)
python3 scripts/humanoid_rig_poc/import_humanoid_motion.py \\
  --input mixamo_walk.fbx \\
  --name walk \\
  --loop \\
  --source mixamo

# Generate procedural placeholder animations
python3 scripts/humanoid_rig_poc/generate_procedural_motion.py --all`}
            </pre>
          </div>

          <div style={{ marginTop: 30 }}>
            <h4>Rig Family Principle</h4>
            <p style={{ color: '#666', fontSize: 14 }}>
              Animation belongs to the rig family, not individual characters. Any generated puppet
              using the <code>abbiesworld.humanoid.child.v1</code> rig can play these animations
              without modification.
            </p>
            <div style={{ 
              background: '#e8f4e8', 
              padding: 15, 
              borderRadius: 8, 
              marginTop: 10,
              fontFamily: 'monospace',
              fontSize: 13,
            }}>
              <div>abbiesworld.humanoid.child.v1 + walk.json = walk animation</div>
              <div style={{ marginTop: 5 }}>different_generated_character + same walk.json = same walk animation</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 40, padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
        <h3 style={{ margin: '0 0 10px' }}>Pipeline Commands</h3>
        <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 15, borderRadius: 4, overflow: 'auto' }}>
{`# 1. Generate construction templates
python3 scripts/humanoid_rig_poc/generate_template.py

# 2. Generate character from reference
python3 scripts/humanoid_rig_poc/generate_character.py \\
  --character-id ${characterId} \\
  --description "A friendly child with colorful clothing"

# 3. Extract body parts
python3 scripts/humanoid_rig_poc/extract_parts.py --character-id ${characterId}

# 4. Validate extraction
python3 scripts/humanoid_rig_poc/validate.py --character-id ${characterId}

# 5. Generate QA contact sheet
python3 scripts/humanoid_rig_poc/contact_sheet.py --character-id ${characterId}`}
        </pre>
      </div>
    </div>
  );
}
