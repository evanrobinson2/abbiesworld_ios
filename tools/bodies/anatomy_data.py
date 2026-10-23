"""Build docs/oracle/bodies/anatomy.json: the Gray's-level data behind the anatomy plates.

Bones with their surface landmarks, joints with Gray's class and a range of motion, muscles with origin, insertion,
action, nerve and the form each makes under the skin, fat pads by sex and build, per-region measurements and the
checklist the modeling threads score against. Each muscle and joint carries the page of Gray's Anatomy (1918) it
was read from (sources/gray1918/excerpts.json, made by gray_extract.py), so every claim can be checked on the scan.
Usage: python3 anatomy_data.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, '..', '..', 'docs', 'oracle', 'bodies')
DIST = os.path.join(HERE, '..', '..', 'prototypes', 'ranch-atelier', 'dist', 'studies', 'bodies-study')

# ---------------------------------------------------------------- bones
# landmarks marked surface=True can be seen or felt through the skin; they are what a model's planes must show.
BONES = [
    dict(id='skull', name='Skull (cranium and mandible)', group='head', landmarks=[
        dict(name='frontal eminences', surface=True, form='two soft bosses of the forehead'),
        dict(name='superciliary arches', surface=True, form='brow ridge, stronger on a man'),
        dict(name='zygomatic arch', surface=True, form='cheekbone ridge running back to the ear'),
        dict(name='external occipital protuberance', surface=True, form='bump at the back of the head where the neck meets it'),
        dict(name='mastoid process', surface=True, form='knob behind the ear lobe; the sternocleidomastoid starts here'),
        dict(name='angle of the mandible', surface=True, form='corner of the jaw, below the ear lobe'),
        dict(name='mental protuberance', surface=True, form='the chin')]),
    dict(id='spine', name='Vertebral column (7 cervical, 12 thoracic, 5 lumbar, sacrum, coccyx)', group='trunk', landmarks=[
        dict(name='spinous process of C7 (vertebra prominens)', surface=True, form='the first knob felt at the base of the neck'),
        dict(name='thoracic spinous processes', surface=True, form='a line of knobs in the back furrow, plainer when bent forward'),
        dict(name='lumbar spinous processes', surface=False, form='sunk in a groove between the two erector columns'),
        dict(name='sacrum', surface=True, form='flat triangle between the two dimples of Venus')],
        curves='cervical lordosis forward, thoracic kyphosis back, lumbar lordosis forward, sacral curve back'),
    dict(id='thorax', name='Thorax (sternum, 12 pairs of ribs, costal cartilages)', group='trunk', landmarks=[
        dict(name='jugular (suprasternal) notch', surface=True, form='the pit of the neck', canon='pit'),
        dict(name='sternal angle', surface=True, form='a cross ridge two fingers below the pit, at the 2nd rib'),
        dict(name='xiphoid process', surface=True, form='tip of the breastbone in the pit of the stomach'),
        dict(name='costal arch', surface=True, form='the lower rim of the ribcage, an inverted V', canon='ribs'),
        dict(name='lower ribs on the flank', surface=True, form='serratus and oblique digitations interlock over them')],
        notes='Egg-shaped, narrow above; ribs slope down and forward; the cartilages of ribs 7 to 10 make the costal arch.'),
    dict(id='clavicle', name='Clavicle', group='shoulder girdle', landmarks=[
        dict(name='sternal end', surface=True, form='knob on each side of the pit'),
        dict(name='shaft', surface=True, form='a shallow S, convex forward on its inner two thirds'),
        dict(name='acromial end', surface=True, form='small step at the shoulder point', canon='acromion')]),
    dict(id='scapula', name='Scapula', group='shoulder girdle', landmarks=[
        dict(name='acromion', surface=True, form='the shoulder point, the top corner of the shoulder', canon='acromion'),
        dict(name='spine of the scapula', surface=True, form='a ridge across the upper shoulder blade; shows as a groove in a muscular back'),
        dict(name='medial (vertebral) border', surface=True, form='edge of the shoulder blade beside the spine, about 2 inches out'),
        dict(name='inferior angle', surface=True, form='the point of the shoulder blade, at the level of the 7th rib'),
        dict(name='coracoid process', surface=False, form='felt in the hollow below the outer clavicle')]),
    dict(id='humerus', name='Humerus', group='arm', landmarks=[
        dict(name='greater tubercle', surface=False, form='under the deltoid; makes the widest point of the shoulders'),
        dict(name='deltoid tuberosity', surface=False, form='halfway down the outer arm, where the deltoid ends'),
        dict(name='medial epicondyle', surface=True, form='the sharp inner knob of the elbow', canon='elbow'),
        dict(name='lateral epicondyle', surface=True, form='the smaller outer knob, in a dimple when the arm is straight')]),
    dict(id='ulna', name='Ulna', group='forearm', landmarks=[
        dict(name='olecranon', surface=True, form='point of the elbow'),
        dict(name='posterior border', surface=True, form='the ulnar furrow along the back of the forearm, bone right under the skin'),
        dict(name='head of the ulna', surface=True, form='knob on the little-finger side of the back of the wrist'),
        dict(name='styloid process of the ulna', surface=True, form='small point below the head')]),
    dict(id='radius', name='Radius', group='forearm', landmarks=[
        dict(name='head of the radius', surface=True, form='turns under the thumb just below the lateral epicondyle'),
        dict(name='styloid process of the radius', surface=True, form='the thumb-side knob of the wrist, lower than the ulnar one', canon='wrist')]),
    dict(id='hand', name='Carpus, metacarpus and phalanges', group='hand', landmarks=[
        dict(name='pisiform', surface=True, form='pea-sized knob at the heel of the hand, little-finger side'),
        dict(name='metacarpal heads', surface=True, form='the knuckles, an arc highest at the middle finger'),
        dict(name='phalangeal joints', surface=True, form='finger joints, each a little box with a crease over it')],
        notes='Hand detail in human-canon.json "hand".'),
    dict(id='pelvis', name='Hip bone (ilium, ischium, pubis) and sacrum', group='pelvis', landmarks=[
        dict(name='iliac crest', surface=True, form='the hip bone ridge; on a lean man the flank pad rolls over it', canon='iliac'),
        dict(name='anterior superior iliac spine (ASIS)', surface=True, form='front point of the hip bone; the inguinal fold starts here', canon='asis'),
        dict(name='posterior superior iliac spine', surface=True, form='a dimple of Venus each side of the sacrum'),
        dict(name='pubic symphysis', surface=False, form='the midline under the lower belly'),
        dict(name='ischial tuberosity', surface=False, form='the sitting bone, under the gluteal fold')],
        notes='Wider, shallower and tilted further forward in a woman: the trochanters become the widest point.'),
    dict(id='femur', name='Femur', group='thigh', landmarks=[
        dict(name='greater trochanter', surface=True, form='a flat or hollow spot on the side of the hip, a hand below the iliac crest', canon='troch'),
        dict(name='shaft', surface=False, form='slants in about 10 degrees from hip to knee (more on a woman)'),
        dict(name='femoral condyles', surface=True, form='the sides of the knee; the inner one lower and bigger', canon='knee'),
        dict(name='adductor tubercle', surface=True, form='small knob above the inner condyle')],
        angles=dict(neck_shaft_deg=125, femoral_anteversion_deg=12, shaft_to_vertical_deg=9)),
    dict(id='patella', name='Patella', group='knee', landmarks=[
        dict(name='patella', surface=True, form='a rounded triangle, point down; sits above the knee joint line when straight', canon='knee')]),
    dict(id='tibia', name='Tibia', group='leg', landmarks=[
        dict(name='tibial tuberosity', surface=True, form='a bump a hand below the kneecap; the patellar ligament ends on it'),
        dict(name='anterior border (shin)', surface=True, form='the shin: a sharp edge, slightly S-shaped, bone right under the skin'),
        dict(name='medial surface', surface=True, form='flat face of the shin, facing in and forward'),
        dict(name='medial malleolus', surface=True, form='the inner ankle bone; higher and further forward than the outer', canon='ankle')]),
    dict(id='fibula', name='Fibula', group='leg', landmarks=[
        dict(name='head of the fibula', surface=True, form='knob on the outer side just below the knee, where the biceps femoris ends'),
        dict(name='lateral malleolus', surface=True, form='the outer ankle bone; lower and further back than the inner')]),
    dict(id='foot', name='Tarsus, metatarsus and phalanges', group='foot', landmarks=[
        dict(name='calcaneus', surface=True, form='the heel; sticks out behind the leg line'),
        dict(name='navicular tuberosity', surface=True, form='knob on the inner arch in front of the ankle'),
        dict(name='base of the 5th metatarsal', surface=True, form='knob halfway along the outer edge of the foot'),
        dict(name='head of the 1st metatarsal', surface=True, form='the ball of the big toe')],
        notes='Arch on the inner side only; the outer edge rests on the ground.'),
]

# ---------------------------------------------------------------- joints
# rom: degrees from the anatomical position. Gray (1918) names the movements but gives few numbers; the numbers are
# the usual clinical averages (American Academy of Orthopaedic Surgeons, Norkin and White). rig: what a modeler's
# skeleton has to allow.
JOINTS = [
    dict(id='temporomandibular', name='Jaw (temporomandibular)', gray_type='ginglymoarthrodial (hinge and glide)', excerpt='temporomandibular',
         rom=dict(mouth_opening_mm=45, protrusion_mm=7, side_shift_mm=10), rig='hinge plus forward slide: the jaw drops and moves forward when the mouth opens wide'),
    dict(id='neck', name='Neck (atlanto-occipital, atlanto-axial and cervical spine)', gray_type='condyloid, trochoid (pivot) and arthrodial', excerpt='atlantoaxial',
         rom=dict(flexion=45, extension=45, side_bend=45, rotation=70), rig='nod at the skull, turn at the atlas, the rest spread over C2 to C7'),
    dict(id='trunk', name='Thoracic and lumbar spine', gray_type='amphiarthroses (discs) and arthrodial facets', excerpt='vertebral_column',
         rom=dict(flexion=80, extension=25, side_bend=35, rotation=45), rig='bend mostly in the lumbar spine, turn mostly in the thoracic; the ribcage and pelvis stay rigid'),
    dict(id='sternoclavicular', name='Sternoclavicular', gray_type='double arthrodial (saddle with a disc)', excerpt='sternoclavicular',
         rom=dict(elevation=45, depression=5, protraction=15, retraction=15, axial_rotation=40), rig='the only bony link of the arm to the trunk: the clavicle rises in a shrug and swings in a reach'),
    dict(id='scapulothoracic', name='Shoulder blade on the ribcage', gray_type='not a true joint: muscles hold the scapula on the ribs', excerpt='acromioclavicular',
         rom=dict(upward_rotation=60, elevation_cm=10, protraction_cm=15), rig='a third of arm raising is the scapula turning; rotate it, do not only rotate the humerus'),
    dict(id='shoulder', name='Shoulder (glenohumeral)', gray_type='enarthrosis (ball and socket)', excerpt='shoulder',
         rom=dict(flexion=180, extension=60, abduction=180, adduction=30, external_rotation=90, internal_rotation=70),
         rig='180 degrees of raising is about 120 here plus 60 from the scapula (2 to 1); the deltoid bunches, the armpit hollow opens'),
    dict(id='elbow', name='Elbow (humero-ulnar and humero-radial)', gray_type='ginglymus (hinge)', excerpt='elbow',
         rom=dict(flexion=150, extension=0, hyperextension=10, carrying_angle_male=10, carrying_angle_female=15),
         rig='one hinge axis; forearm angles out in extension (the carrying angle) and lines up with the arm in flexion'),
    dict(id='forearm', name='Forearm (proximal and distal radioulnar)', gray_type='trochoid (pivot)', excerpt='proximal_radioulnar',
         rom=dict(pronation=80, supination=80), rig='the radius crosses over the ulna; twist the forearm along its length, never at the wrist'),
    dict(id='wrist', name='Wrist (radiocarpal and midcarpal)', gray_type='condyloid', excerpt='wrist',
         rom=dict(flexion=80, extension=70, radial_deviation=20, ulnar_deviation=30), rig='two axes, no twist; bends further to the little-finger side'),
    dict(id='thumb', name='Thumb carpometacarpal', gray_type='saddle', excerpt='hand_and_wrist',
         rom=dict(flexion=15, extension=20, abduction=70, opposition='tip to little-finger tip'), rig='the thumb swings across the palm on its own saddle joint at the wrist'),
    dict(id='mcp', name='Knuckles (metacarpophalangeal)', gray_type='condyloid', excerpt='metacarpophalangeal',
         rom=dict(flexion=90, extension=20, abduction=20), rig='fingers spread only when straight'),
    dict(id='finger', name='Finger joints (interphalangeal)', gray_type='ginglymus (hinge)', excerpt='interphalangeal_hand',
         rom=dict(pip_flexion=100, dip_flexion=90, dip_extension=10), rig='hinges only; a curling finger makes a spiral toward the base of the thumb'),
    dict(id='hip', name='Hip', gray_type='enarthrosis (ball and socket)', excerpt='hip',
         rom=dict(flexion=120, extension=30, abduction=45, adduction=30, internal_rotation=45, external_rotation=45),
         rig='a deep socket: extension is short, so a leg swinging back is helped by the pelvis tilting'),
    dict(id='knee', name='Knee', gray_type='ginglymus (hinge) with some rotation, a condyloid joint in Gray', excerpt='knee',
         rom=dict(flexion=135, extension=0, hyperextension=5, rotation_when_bent=30), rig='locks with a small twist at full extension; the kneecap slides down its groove as it bends'),
    dict(id='ankle', name='Ankle (talocrural)', gray_type='ginglymus (hinge)', excerpt='ankle',
         rom=dict(dorsiflexion=20, plantarflexion=50), rig='hinge on a slanted axis through the two malleoli: the foot points slightly out as it flexes'),
    dict(id='subtalar', name='Subtalar and midtarsal', gray_type='arthrodial', excerpt='subtalar',
         rom=dict(inversion=35, eversion=15), rig='the foot rolls in and out here, not at the ankle'),
    dict(id='toes', name='Toes (metatarsophalangeal)', gray_type='condyloid', excerpt='metatarsophalangeal',
         rom=dict(big_toe_extension=70, big_toe_flexion=45), rig='the toe break: the foot bends here in every step'),
]

# ---------------------------------------------------------------- muscles
# layer 1 superficial (the plates draw it), 2 deep but it shapes the surface, 3 deep. views: plates it shows on.
# surface: the form it makes under the skin, what a modeler should see.
def m(id, name, gray, region, layer, views, origin, insertion, action, nerve, surface):
    return dict(id=id, name=name, gray=gray, region=region, layer=layer, views=views, origin=origin, insertion=insertion,
                action=action, nerve=nerve, surface=surface)

MUSCLES = [
    # head and neck
    m('masseter', 'Masseter', 'Masseter', 'head', 1, ['front', 'side'], 'zygomatic arch', 'angle and outer face of the mandible ramus',
      'closes the jaw', 'mandibular nerve (V3)', 'squares the back of the jaw; bulges when the teeth clench'),
    m('temporalis', 'Temporalis', 'Temporalis', 'head', 1, ['side'], 'temporal fossa', 'coronoid process of the mandible',
      'closes the jaw, pulls it back', 'mandibular nerve (V3)', 'fills the temple; fans out above the ear'),
    m('platysma', 'Platysma', 'Platysma', 'neck', 1, ['front'], 'fascia over the upper chest', 'lower border of the mandible, skin of the lower face',
      'tenses the neck skin, pulls the mouth corners down', 'facial nerve (VII)', 'thin sheet; shows only as vertical cords in strain'),
    m('sternocleidomastoid', 'Sternocleidomastoid', 'Sternocleidomastoideus', 'neck', 1, ['front', 'side', 'back'],
      'two heads: front of the manubrium (sternum) and inner third of the clavicle', 'mastoid process and the superior nuchal line',
      'one side: tilts the head to its side and turns the face away; both: flex the neck', 'accessory nerve (XI), C2 and C3',
      'the strap from behind the ear to the pit of the neck; the two make the V of the neck and a hollow between their heads'),
    m('scalenes', 'Scalenes', 'Scalenus anterior', 'neck', 2, ['side'], 'transverse processes of C3 to C6', 'first and second ribs',
      'raise the first ribs, bend the neck to the side', 'cervical nerves C4 to C6', 'fill the triangle behind the sternocleidomastoid'),
    m('splenius', 'Splenius capitis', 'Splenius capitis', 'neck', 2, ['back', 'side'], 'ligamentum nuchae and spines of C7 to T3',
      'mastoid process and the occipital bone', 'extends the head, turns it to its own side', 'dorsal rami of the middle cervical nerves',
      'a band under the trapezius at the back of the neck'),
    # trunk
    m('trapezius', 'Trapezius', 'Trapezius', 'back', 1, ['back', 'side', 'front'],
      'external occipital protuberance, ligamentum nuchae and the spines of C7 to T12',
      'outer third of the clavicle, acromion and spine of the scapula', 'upper: shrugs and turns the scapula up; middle: pulls it in; lower: pulls it down',
      'accessory nerve (XI), C3 and C4', 'a kite-shaped sheet; the slope from neck to shoulder; a tendinous diamond at C7 shows as a flat spot'),
    m('latissimus', 'Latissimus dorsi', 'Latissimus dorsi', 'back', 1, ['back', 'side'],
      'spines of T7 to the sacrum by the thoracolumbar fascia, iliac crest, lower ribs and the inferior angle of the scapula',
      'floor of the intertubercular groove of the humerus', 'pulls the arm down, back and inward (climbing, rowing)', 'thoracodorsal nerve',
      'the wing of the back; makes the V taper and the back wall of the armpit'),
    m('rhomboids', 'Rhomboids (major and minor)', 'Rhomboideus major', 'back', 2, ['back'], 'spines of C7 to T5',
      'medial border of the scapula', 'pull the scapula toward the spine and up', 'dorsal scapular nerve',
      'under the trapezius; a ridge between the shoulder blades when they pinch together'),
    m('levator', 'Levator scapulae', 'Levator scapulae', 'neck', 2, ['side', 'back'], 'transverse processes of C1 to C4',
      'superior angle of the scapula', 'lifts the scapula', 'dorsal scapular nerve, C3 and C4', 'part of the slope of the neck, behind the sternocleidomastoid'),
    m('erector', 'Erector spinae', 'Sacrospinalis', 'back', 2, ['back', 'side'], 'sacrum, iliac crest and lumbar spines',
      'ribs and spines and transverse processes all the way up to the skull', 'straightens and arches the back, bends it to the side',
      'dorsal rami of the spinal nerves', 'two thick columns either side of the spine in the lower back; the furrow lies between them'),
    m('pec_major', 'Pectoralis major', 'Pectoralis major', 'chest', 1, ['front', 'side'],
      'inner half of the clavicle, front of the sternum, cartilages of ribs 1 to 6 and the external oblique aponeurosis',
      'crest of the greater tubercle of the humerus (fibers twist: the lowest insert highest)',
      'pulls the arm across the chest, rotates it in; clavicular part raises it', 'medial and lateral pectoral nerves (Gray: anterior thoracic)',
      'the chest plate; its lower border is the front wall of the armpit; a clavicular and a sternal part'),
    m('pec_minor', 'Pectoralis minor', 'Pectoralis minor', 'chest', 3, [], 'ribs 3 to 5', 'coracoid process of the scapula',
      'pulls the scapula forward and down', 'medial pectoral nerve', 'hidden; fills out the upper chest under the pectoralis major'),
    m('serratus', 'Serratus anterior', 'Serratus anterior', 'trunk', 1, ['front', 'side'], 'outer faces of ribs 1 to 8 or 9',
      'medial border of the scapula, front face', 'pulls the scapula forward round the ribs (punching), turns it up',
      'long thoracic nerve', 'saw-tooth fingers on the side of the ribcage below the armpit; 4 show, interlocking with the external oblique'),
    m('ext_oblique', 'External oblique', 'Obliquus externus', 'abdomen', 1, ['front', 'side', 'back'],
      'outer faces of the lower 8 ribs, interlocking with the serratus and latissimus',
      'front half of the iliac crest and, by its aponeurosis, the linea alba and the inguinal ligament',
      'bends and turns the trunk, compresses the belly', 'lower intercostal nerves (T7 to T12), iliohypogastric',
      'the flank; its fleshy part ends above the iliac crest in the flank pad; fibers run down and forward like hands in front pockets'),
    m('rectus_abdominis', 'Rectus abdominis', 'Rectus abdominis', 'abdomen', 1, ['front', 'side'], 'crest of the pubis and the symphysis',
      'cartilages of ribs 5 to 7 and the xiphoid', 'bends the trunk forward', 'lower intercostal nerves (T7 to T12)',
      'the "six-pack": three tendinous intersections above the navel (one at it, one at the xiphoid and one between), none below; the lower belly is one smooth form'),
    # shoulder and arm
    m('deltoid', 'Deltoid', 'Deltoideus', 'shoulder', 1, ['front', 'back', 'side'],
      'outer third of the clavicle, acromion and spine of the scapula (the same line the trapezius ends on)',
      'deltoid tuberosity, halfway down the outer humerus', 'raises the arm: front part forward, middle part sideways, back part backward',
      'axillary nerve', 'caps the shoulder; a thick V wedge into the outer arm; the middle part is multipennate and bulges in bands'),
    m('supraspinatus', 'Supraspinatus', 'Supraspinatus', 'shoulder', 3, [], 'supraspinous fossa', 'top facet of the greater tubercle',
      'starts raising the arm', 'suprascapular nerve', 'under the trapezius; fills the hollow above the spine of the scapula'),
    m('infraspinatus', 'Infraspinatus', 'Infraspinatus', 'shoulder', 1, ['back'], 'infraspinous fossa', 'middle facet of the greater tubercle',
      'rotates the arm out', 'suprascapular nerve', 'a flat triangle on the shoulder blade below the spine'),
    m('teres_minor', 'Teres minor', 'Teres minor', 'shoulder', 1, ['back'], 'upper outer border of the scapula', 'lowest facet of the greater tubercle',
      'rotates the arm out', 'axillary nerve', 'a small roll below the infraspinatus'),
    m('teres_major', 'Teres major', 'Teres major', 'shoulder', 1, ['back'], 'inferior angle of the scapula', 'medial lip of the intertubercular groove',
      'pulls the arm in and back, rotates it in', 'lower subscapular nerve', 'a thick roll from the shoulder-blade point into the armpit, above the latissimus'),
    m('subscapularis', 'Subscapularis', 'Subscapularis', 'shoulder', 3, [], 'subscapular fossa (front face of the scapula)', 'lesser tubercle of the humerus',
      'rotates the arm in', 'upper and lower subscapular nerves', 'hidden between the scapula and the ribs'),
    m('coracobrachialis', 'Coracobrachialis', 'Coracobrachialis', 'arm', 2, ['front'], 'coracoid process', 'middle of the inner humerus',
      'flexes and adducts the arm', 'musculocutaneous nerve', 'a small roll in the armpit when the arm is raised'),
    m('biceps', 'Biceps brachii', 'Biceps brachii', 'arm', 1, ['front', 'side'], 'long head: above the glenoid; short head: coracoid process',
      'radial tuberosity, and the bicipital aponeurosis into the forearm fascia',
      'bends the elbow and turns the palm up (supinates)', 'musculocutaneous nerve',
      'a long oval on the front of the arm, ending in a cord at the elbow crease; peaks when the palm turns up'),
    m('brachialis', 'Brachialis', 'Brachialis', 'arm', 2, ['front', 'side'], 'lower half of the front of the humerus', 'coronoid process and tuberosity of the ulna',
      'bends the elbow', 'musculocutaneous nerve', 'shows either side of the biceps above the elbow; widens the lower arm from the side'),
    m('triceps', 'Triceps brachii', 'Triceps brachii', 'arm', 1, ['back', 'side'],
      'long head: below the glenoid; lateral head: back of the humerus above the radial groove; medial head: below it',
      'olecranon of the ulna by a broad flat tendon', 'straightens the elbow', 'radial nerve',
      'a horseshoe on the back of the arm: two heads above a flat tendon plate that fills the lower third'),
    m('anconeus', 'Anconeus', 'Anconaeus', 'forearm', 1, ['back'], 'lateral epicondyle (back)', 'side of the olecranon and the upper ulna',
      'helps straighten the elbow', 'radial nerve', 'a small triangle beside the point of the elbow'),
    m('pronator_teres', 'Pronator teres', 'Pronator teres', 'forearm', 1, ['front'], 'medial epicondyle and the coronoid process',
      'middle of the outer radius', 'turns the palm down', 'median nerve', 'the inner edge of the elbow hollow, running across to the outer forearm'),
    m('flexors', 'Forearm flexors (flexor carpi radialis, palmaris longus, flexor carpi ulnaris, flexor digitorum superficialis)', 'Flexor carpi radialis',
      'forearm', 1, ['front', 'side'], 'common flexor origin on the medial epicondyle', 'front of the wrist and hand: 2nd metacarpal, palmar fascia, pisiform, middle phalanges',
      'bend the wrist and fingers', 'median nerve; flexor carpi ulnaris by the ulnar nerve',
      'the fleshy inner mass of the forearm, bellies in the upper half, tendons below; the palmaris and flexor carpi radialis tendons stand out at the wrist'),
    m('brachioradialis', 'Brachioradialis', 'Brachioradialis', 'forearm', 1, ['front', 'side', 'back'], 'lateral supracondylar ridge of the humerus, a third of the way up the arm',
      'styloid process of the radius', 'bends the elbow, most in mid-turn (thumb up)', 'radial nerve',
      'the outer bulge just below the elbow; with the extensor carpi radialis it makes the "outer mass" of the forearm, separate from the extensors'),
    m('ecr', 'Extensor carpi radialis longus and brevis', 'Extensor carpi radialis longus', 'forearm', 1, ['back', 'side'],
      'lateral supracondylar ridge and lateral epicondyle', 'bases of the 2nd and 3rd metacarpals', 'extend the wrist and tilt it to the thumb side',
      'radial nerve', 'continue the brachioradialis down the outer forearm'),
    m('extensors', 'Extensor digitorum and extensor carpi ulnaris', 'Extensor digitorum communis', 'forearm', 1, ['back', 'side'],
      'common extensor origin on the lateral epicondyle', 'extensor expansions of the fingers; base of the 5th metacarpal',
      'straighten the fingers and the wrist', 'posterior interosseous (radial) nerve', 'the back of the forearm; tendons fan over the back of the hand'),
    m('apl', 'Abductor pollicis longus and extensor pollicis brevis', 'Abductor pollicis longus', 'forearm', 1, ['back', 'front', 'side'],
      'back of the radius and ulna, middle third', 'base of the thumb metacarpal and its first phalanx', 'pull the thumb out and back',
      'posterior interosseous nerve', 'a small diagonal ridge crossing the lower radius, toward the thumb'),
    # hip and thigh
    m('iliopsoas', 'Iliopsoas (psoas major and iliacus)', 'Psoas major', 'hip', 3, ['front'], 'lumbar vertebrae and the iliac fossa', 'lesser trochanter',
      'the strongest hip flexor', 'femoral nerve and lumbar plexus', 'deep; shows only in the floor of the triangle below the groin'),
    m('sartorius', 'Sartorius', 'Sartorius', 'thigh', 1, ['front', 'side'], 'anterior superior iliac spine', 'upper inner face of the tibia (pes anserinus)',
      'flexes, abducts and turns out the hip, bends the knee (sitting cross-legged)', 'femoral nerve',
      'the longest muscle: a strap across the front of the thigh in a long S, dividing the quads from the adductors'),
    m('tfl', 'Tensor fasciae latae', 'Tensor fasciae latae', 'hip', 1, ['front', 'side'], 'outer lip of the iliac crest behind the ASIS',
      'iliotibial band', 'flexes and abducts the hip, steadies the knee', 'superior gluteal nerve', 'a short bulge below and behind the hip point'),
    m('glute_med', 'Gluteus medius', 'Glutaeus medius', 'hip', 1, ['back', 'side'], 'outer ilium below the crest', 'outer greater trochanter',
      'abducts the hip, holds the pelvis level on one leg', 'superior gluteal nerve', 'the fullness on the side of the hip above the trochanter, under the iliac crest'),
    m('glute_max', 'Gluteus maximus', 'Glutaeus maximus', 'hip', 1, ['back', 'side'], 'back of the ilium, sacrum, coccyx and the sacrotuberous ligament',
      'iliotibial band (most) and the gluteal tuberosity of the femur', 'extends the hip (climbing, rising, running), turns it out',
      'inferior gluteal nerve', 'the buttock: a thick square slanting down and out; its lower edge is not the gluteal fold (that is fat and skin)'),
    m('rectus_femoris', 'Rectus femoris', 'Rectus femoris', 'thigh', 1, ['front', 'side'], 'anterior inferior iliac spine and above the acetabulum',
      'patella, and on through the patellar ligament to the tibial tuberosity', 'extends the knee, flexes the hip', 'femoral nerve',
      'the middle of the front of the thigh, a long spindle'),
    m('vastus_lateralis', 'Vastus lateralis', 'Vastus lateralis', 'thigh', 1, ['front', 'side', 'back'], 'greater trochanter and the lateral lip of the linea aspera',
      'outer patella and quadriceps tendon', 'extends the knee', 'femoral nerve', 'the big outer thigh; highest bulge on the outside'),
    m('vastus_medialis', 'Vastus medialis', 'Vastus medialis', 'thigh', 1, ['front'], 'medial lip of the linea aspera', 'inner patella and quadriceps tendon',
      'extends the knee, steadies the kneecap', 'femoral nerve', 'the teardrop above and inside the knee: lower than the outer bulge'),
    m('adductors', 'Adductors (pectineus, adductor longus, gracilis, adductor magnus)', 'Adductor longus', 'thigh', 1, ['front', 'back'],
      'pubis and ischium', 'linea aspera of the femur; gracilis to the upper inner tibia', 'pull the thighs together',
      'obturator nerve; the hamstring part of the adductor magnus by the sciatic', 'the inner thigh mass, widest near the groin, tapering to the knee'),
    m('biceps_femoris', 'Biceps femoris', 'Biceps femoris', 'thigh', 1, ['back', 'side'], 'long head: ischial tuberosity; short head: linea aspera',
      'head of the fibula', 'bends the knee, extends the hip, turns the bent knee out', 'sciatic nerve (tibial and common peroneal parts)',
      'the outer hamstring; its tendon is the cord on the outside of the back of the knee'),
    m('semis', 'Semitendinosus and semimembranosus', 'Semitendinosus', 'thigh', 1, ['back', 'side'], 'ischial tuberosity',
      'upper inner tibia (pes anserinus) and the back of the medial tibial condyle', 'bend the knee, extend the hip, turn the bent knee in',
      'sciatic nerve (tibial part)', 'the inner hamstrings; their tendons are the cords on the inside of the back of the knee'),
    # leg and foot
    m('tibialis_anterior', 'Tibialis anterior', 'Tibialis anterior', 'leg', 1, ['front', 'side'], 'upper two thirds of the outer tibia', 'medial cuneiform and 1st metatarsal base',
      'lifts the foot (dorsiflexes) and turns its sole in', 'deep peroneal nerve', 'a long belly just outside the shin edge; its tendon stands out in front of the ankle'),
    m('edl', 'Extensor digitorum longus and extensor hallucis longus', 'Extensor digitorum longus', 'leg', 1, ['front', 'side'],
      'upper fibula and lateral tibial condyle', 'toes, through tendons over the top of the foot', 'lift the toes and the foot',
      'deep peroneal nerve', 'between the tibialis and the peronei; tendons fan over the top of the foot'),
    m('peronei', 'Peroneus longus and brevis', 'Peronaeus longus', 'leg', 1, ['side', 'back', 'front'], 'outer fibula',
      'longus: under the foot to the 1st metatarsal; brevis: base of the 5th metatarsal', 'turn the sole out (evert), point the foot',
      'superficial peroneal nerve', 'a narrow band down the outer leg; the tendons curl behind the outer ankle bone'),
    m('gastrocnemius', 'Gastrocnemius', 'Gastrocnemius', 'leg', 1, ['back', 'side', 'front'], 'two heads: back of the medial and lateral femoral condyles',
      'calcaneus through the Achilles tendon', 'points the foot, bends the knee', 'tibial nerve',
      'the calf: two heads, the inner one bigger and lower; they end in a W-shaped edge halfway down where the tendon begins'),
    m('soleus', 'Soleus', 'Soleus', 'leg', 1, ['back', 'side', 'front'], 'back of the upper fibula and the soleal line of the tibia', 'calcaneus through the Achilles tendon',
      'points the foot (standing, walking)', 'tibial nerve', 'widens the lower calf either side of the gastrocnemius; shows on both sides from the front'),
    m('achilles', 'Calcaneal (Achilles) tendon', 'Gastrocnemius', 'leg', 1, ['back', 'side'], 'joined tendons of the gastrocnemius and soleus', 'back of the calcaneus',
      'carries the calf pull to the heel', 'none (a tendon)', 'a cord behind the ankle, narrowing then widening onto the heel, with hollows either side'),
    m('tibialis_posterior', 'Tibialis posterior and the long toe flexors', 'Tibialis posterior', 'leg', 3, [], 'back of the tibia and fibula and the interosseous membrane',
      'navicular and the bones of the sole; the toes', 'point and invert the foot, hold the arch', 'tibial nerve', 'deep; their tendons curl behind the inner ankle bone'),
]

# plate muscle name (data-m in the SVGs, by prefix) -> muscle id above, so the study page can open a muscle on tap
PLATE_INDEX = [
    ('abductor pollicis', 'apl'), ('adductor', 'adductors'), ('gracilis', 'adductors'), ('pectineus', 'adductors'), ('anconeus', 'anconeus'),
    ('biceps brachii', 'biceps'), ('biceps femoris', 'biceps_femoris'), ('brachialis', 'brachialis'), ('brachioradialis', 'brachioradialis'),
    ('calcaneal', 'achilles'), ('coracobrachialis', 'coracobrachialis'), ('deltoid', 'deltoid'), ('erector', 'erector'),
    ('extensor carpi radialis', 'ecr'), ('extensor carpi ulnaris', 'extensors'), ('extensor digitorum longus', 'edl'), ('extensor digitorum brevis', 'edl'),
    ('extensor digitorum', 'extensors'), ('forearm extensors', 'extensors'), ('external oblique', 'ext_oblique'),
    ('flexor', 'flexors'), ('palmaris', 'flexors'), ('forearm flexors', 'flexors'), ('gastrocnemius', 'gastrocnemius'),
    ('gluteus maximus', 'glute_max'), ('gluteus medius', 'glute_med'), ('iliopsoas', 'iliopsoas'), ('iliotibial', 'tfl'), ('tensor', 'tfl'),
    ('infraspinatus', 'infraspinatus'), ('latissimus', 'latissimus'), ('levator', 'levator'), ('peroneus', 'peronei'), ('pronator', 'pronator_teres'),
    ('rectus abdominis', 'rectus_abdominis'), ('rectus femoris', 'rectus_femoris'), ('patellar ligament', 'rectus_femoris'), ('rhomboid', 'rhomboids'),
    ('sartorius', 'sartorius'), ('scalene', 'scalenes'), ('semi', 'semis'), ('serratus anterior', 'serratus'), ('splenius', 'splenius'),
    ('sternocleidomastoid', 'sternocleidomastoid'), ('supraspinatus', 'supraspinatus'), ('teres major', 'teres_major'), ('teres minor', 'teres_minor'),
    ('tibialis anterior', 'tibialis_anterior'), ('trapezius', 'trapezius'), ('triceps', 'triceps'), ('vastus lateralis', 'vastus_lateralis'),
    ('vastus medialis', 'vastus_medialis'), ('soleus', 'soleus'),
]

# ---------------------------------------------------------------- fat
# Subcutaneous fat pads, where they sit and how they change the silhouette. thickness_mm: typical single-layer
# thickness for an average young adult (from skinfold norms, half the skinfold); lean and heavy builds scale them.
FAT = [
    dict(id='buccal', where='cheek, in front of the masseter', male='small', female='small', change='hollows the cheek when lean; rounds the face when heavy', thickness_mm=[5, 5]),
    dict(id='submental', where='under the chin', male='builds early on heavy men', female='some', change='softens the jaw line from the side', thickness_mm=[5, 6]),
    dict(id='breast', where='over the pectoralis major (female)', male='none (a flat nipple plate)', female='a teardrop resting on the pectoral, lower half fuller, about rib 2 to rib 6',
         change='the female chest form; drawn as clothed or simplified volume in PG art, never detailed', thickness_mm=[3, None]),
    dict(id='triceps', where='back of the upper arm', male='thin', female='thicker: softens the triceps horseshoe', change='hides the triceps shape', thickness_mm=[6, 10]),
    dict(id='lower_abdomen', where='below the navel', male='moderate', female='moderate', change='rounds the lower belly forward; hides the lowest rectus', thickness_mm=[12, 16]),
    dict(id='flank', where='over the iliac crest, at the side of the waist', male='the "love handle": the first place a man gains', female='less, sits lower', change='rolls over the iliac crest and hides the oblique', thickness_mm=[12, 12]),
    dict(id='gluteal', where='over the gluteus maximus and the hip', male='thin', female='thick: rounds the buttock and makes the gluteal fold', change='makes the gluteal fold and the round of the buttock', thickness_mm=[12, 20]),
    dict(id='lateral_thigh', where='outer upper thigh below the trochanter', male='thin', female='thick ("saddle"): makes the trochanter the widest point', change='fills the hollow over the trochanter', thickness_mm=[8, 18]),
    dict(id='medial_knee', where='inner side of the knee', male='small', female='a soft pad', change='softens the inner knee into the thigh', thickness_mm=[6, 10]),
    dict(id='infrapatellar', where='either side of the patellar ligament (Hoffa pad)', male='yes', female='yes', change='two soft puffs beside the ligament when the knee is straight', thickness_mm=[5, 5]),
    dict(id='heel', where='under the calcaneus', male='thick', female='thick', change='round, firm heel; the heel sticks out behind the leg', thickness_mm=[18, 18]),
    dict(id='palm', where='heel of the hand, thumb base, finger pads', male='yes', female='yes', change='soft pads; no bones show in the palm', thickness_mm=[6, 6]),
]
BUILD_FAT = dict(skinny=0.5, average=1.0, heroic=0.6, heavy=2.2,
                 rule='Fat fills hollows first (between muscles, over the trochanter, at the flank), then rounds the forms. A lean build shows tendons and the gaps between muscles; a heavy build shows the fat pads above, not bigger muscles.')

# ---------------------------------------------------------------- surface, by view
SURFACE = dict(
    front=['pit of the neck between the two sternocleidomastoid heads', 'clavicles in a shallow S', 'pectoral plate with its lower edge into the armpit',
           'costal arch (inverted V)', 'three rectus intersections above the navel, smooth below', 'the iliac crest and flank pad', 'inguinal fold from the ASIS to the pubis',
           'sartorius S dividing the thigh', 'outer thigh higher than the inner teardrop', 'kneecap with the infrapatellar puffs', 'shin edge straight, calf curves either side',
           'inner ankle higher than the outer'],
    side=['head carried forward of the shoulders, neck leaning forward 15 degrees', 'S-curve of the spine: back of the ribcage rounded, lumbar hollow', 'chest pushes forward of the belly on a lean figure',
          'buttock is the furthest point back', 'front of the thigh bows forward, the back is flatter', 'knee: kneecap in front, hamstring cords behind', 'calf bulges back high on the leg',
          'shin straight, Achilles cord behind the ankle', 'the ear sits over the shoulder, the shoulder over the hip, the hip over the ankle (plumb line)'],
    back=['C7 knob at the base of the neck', 'trapezius diamond', 'spine of the scapula as a groove, the shoulder blades as flat plates', 'erector columns with the furrow between',
          'latissimus V to the waist', 'two dimples of Venus over the posterior iliac spines', 'gluteus medius fullness above the buttock', 'gluteal fold (fat and skin, not muscle)',
          'hamstring cords at the back of the knee', 'calf heads: the inner lower than the outer', 'Achilles with a hollow either side'],
)

# ---------------------------------------------------------------- measurements by region
def measure(canon):
    """Measurements by body region, in heads and in cm at the canon's reference stature."""
    out = {}
    for key, fig in canon['figures'].items():
        H = fig['heads']; up, lo, w, d = fig['upper'], fig['lower'], fig['width'], fig['depth']
        y = {k: H - v for k, v in up.items()}        # upper landmarks are heads down from the crown
        # lower landmarks are fractions of the crotch height, from the floor
        y.update({k: v * y['crotch'] for k, v in lo.items()})
        rows = []
        def add(region, what, heads):
            rows.append(dict(region=region, what=what, heads=round(heads, 3)))
        add('head', 'height, crown to chin', 1.0); add('head', 'width', w['head']); add('head', 'depth', d['head'])
        add('neck', 'length, chin to pit', up['pit'] - up['chin']); add('neck', 'width', w['neck']); add('neck', 'depth', d['neck'])
        add('shoulders', 'width across the deltoids', w['shoulders'])
        add('torso', 'chest width at the nipples', w['chest']); add('torso', 'chest depth', d['chest'])
        add('torso', 'waist width', w['waist']); add('torso', 'waist depth', d['waist'])
        add('torso', 'pit to navel', up['navel'] - up['pit']); add('torso', 'navel to crotch', up['crotch'] - up['navel'])
        add('pelvis', 'width at the trochanters', w['hips']); add('pelvis', 'buttock depth', d['buttocks'])
        add('arm', 'upper arm, acromion to elbow', up['elbow'] - up['acromion']); add('arm', 'upper arm width', w['upper_arm'])
        add('arm', 'forearm, elbow to wrist', up['wrist'] - up['elbow']); add('arm', 'forearm width at the bellies', w['forearm']); add('arm', 'wrist width', w['wrist'])
        add('hand', 'length, wrist to fingertip', up['fingertip'] - up['wrist']); add('hand', 'width at the knuckles', w['hand'])
        add('leg', 'thigh, trochanter to mid-knee', y['troch'] - y['knee']); add('leg', 'thigh width (top)', w['thigh']); add('leg', 'thigh depth', d['thigh'])
        add('leg', 'knee width', w['knee'])
        add('leg', 'lower leg, mid-knee to ankle', y['knee'] - y['ankle']); add('leg', 'calf width', w['calf']); add('leg', 'calf depth', d['calf']); add('leg', 'ankle width', w['ankle'])
        add('foot', 'length', d['foot']); add('foot', 'width', w['foot'])
        add('whole', 'stature', H); add('whole', 'crotch height (half the stature)', y['crotch'])
        out[key] = dict(label=fig['label'], heads=H, rows=rows)
    return out

CHECKLIST = [
    # id, region, check, how to score, tolerance
    ('proportion.heads', 'whole', 'Stature in heads matches the figure (7.5 man, 7.4 woman; heroic 8 to 8.5)', 'crown to floor / crown to chin', '±0.15 head'),
    ('proportion.crotch', 'whole', 'The crotch sits at half the stature', 'crotch height / stature', '0.48 to 0.52'),
    ('proportion.landmarks', 'whole', 'Pit, nipples, navel, wrist, knee and ankle within tolerance of the canon (score_body.py)', 'score_body.py on body.json', 'human-canon.json tolerance'),
    ('skeleton.ribcage', 'torso', 'Ribcage is an egg, narrow at the top, tilted back about 10 degrees; costal arch visible on a lean figure', 'side and front view', 'reads at a glance'),
    ('skeleton.pelvis', 'pelvis', 'Pelvis tilts forward; the ASIS and iliac crest are where the canon puts them; woman wider than her ribcage', 'front and side view', 'ASIS ±0.1 head'),
    ('skeleton.spine', 'back', 'S-curve from the side: neck forward, thoracic back, lumbar hollow; plumb line ear, shoulder, hip, ankle', 'side view', 'plumb line within 0.15 head'),
    ('skeleton.subcutaneous', 'all', 'Every surface=True bone landmark shows as a plane change or knob: clavicle, acromion, C7, scapula spine, elbow epicondyles, olecranon, wrist styloids, iliac crest, ASIS, trochanter dimple, kneecap, tibial tuberosity, shin, malleoli', 'tick each landmark', 'at least 12 of 15'),
    ('joints.rig', 'all', 'Joints bend on the right axes with the ROM in the joints table; no joint bends past it', 'pose test: full range each joint', 'within 10 degrees'),
    ('joints.shoulder_rhythm', 'shoulder', 'Raising the arm overhead also turns the scapula and lifts the clavicle (2 to 1)', 'arm-up pose, back view', 'scapula visibly rotates'),
    ('joints.carrying_angle', 'arm', 'Straight arm angles out at the elbow, palms forward', 'front view, anatomical pose', '5 to 15 degrees'),
    ('muscle.neck', 'neck', 'Sternocleidomastoid V into the pit; trapezius slope from neck to shoulder', 'front and side view', 'both present'),
    ('muscle.chest', 'chest', 'Pectoral plate with its lower edge folding into the armpit; deltoid wedge into the arm', 'front view', 'both present'),
    ('muscle.abdomen', 'abdomen', 'Rectus with three intersections above the navel only; external oblique flank over the iliac crest; serratus fingers on the ribs', 'front and side view', 'right count, right place'),
    ('muscle.back', 'back', 'Trapezius kite, latissimus V, erector columns with the furrow, shoulder blades as plates', 'back view', 'all four'),
    ('muscle.arm', 'arm', 'Biceps in front, triceps horseshoe and tendon plate behind; brachialis shows either side of the biceps', 'front, side and back view', 'all present'),
    ('muscle.forearm', 'forearm', 'Bellies in the upper half, tendons below; the outer mass (brachioradialis) starts above the elbow and is separate from the extensors', 'side view', 'taper plus outer mass'),
    ('muscle.thigh', 'thigh', 'Outer thigh bulge higher than the inner teardrop; sartorius S divides quads from adductors; front of the thigh bows forward', 'front and side view', 'bulges offset'),
    ('muscle.hip', 'hip', 'Gluteus medius fullness under the iliac crest; buttock the furthest point back; trochanter hollow on a lean man', 'side and back view', 'present'),
    ('muscle.knee', 'knee', 'Kneecap with the patellar ligament to the tibial tuberosity; hamstring cords behind; the knee box sits between two cylinders', 'front, side and back view', 'present'),
    ('muscle.calf', 'leg', 'Calf: inner head lower than the outer, soleus wider below; shin straight; Achilles cord with hollows either side', 'front, side and back view', 'all present'),
    ('fat.sex', 'all', 'Fat pads follow the sex and build (fat table): a woman\'s gluteal and lateral-thigh pads make the trochanters her widest point; a man\'s gather at the flank', 'front view widths', 'matches the build'),
    ('fat.lean_shows_tendons', 'all', 'A lean build shows the gaps between muscles and the tendons (wrist, ankle, back of the knee); a heavy build hides them under pads, not bigger muscles', 'compare builds', 'build reads correctly'),
    ('surface.no_sausage', 'limbs', 'No limb bulges on both edges at the same height (construction.json limb rules)', 'trace both edges of each limb', 'no matches'),
    ('surface.planes', 'all', 'Planes read before detail: 6 to 8 per limb; folds only where bone is near the skin', 'flat-shaded render', 'reads in flat shading'),
    ('pg', 'all', 'PG: underwear or a smooth mannequin form, no genitals, nothing sexualised; breast is a simple clothed volume', 'look', 'pass or fail'),
]


def main():
    canon = json.load(open(os.path.join(DOCS, 'human-canon.json')))
    ex = json.load(open(os.path.join(DOCS, 'sources', 'gray1918', 'excerpts.json')))
    for mu in MUSCLES:
        e = ex['muscles'].get(mu['gray'])
        if e:
            mu['gray_page'] = e['page']; mu['gray_url'] = e['url']
    for j in JOINTS:
        e = ex['joints'].get(j['excerpt'])
        j['gray_page'] = e['page']; j['gray_url'] = e['url']
    data = dict(
        study='AW-STUDY-0016 - Bodies and Creatures', installment='1c', title="Anatomy at Gray's depth: bone, joint, muscle, fat and surface",
        version='1.0', date='2026-10-23',
        reads_with='human-canon.json (landmarks and widths in heads), construction.json (how to build the forms), sources/gray1918/excerpts.json (the Gray passages)',
        how_to_use=('Model bone first: put every surface landmark where the canon puts it. Rig the joints with the types and ranges below. '
                    'Lay the muscles by their origin and insertion (they decide the direction of every bulge), then the fat pads for the sex and build, '
                    'then check the surface list for each view. Score with the checklist.'),
        sources=dict(
            gray1918=ex['source'] + ' Read from the Wikisource transcription; each muscle and joint links to its scan page.',
            rom='Ranges of motion: American Academy of Orthopaedic Surgeons averages as given in Norkin and White, Measurement of Joint Motion. Gray (1918) names each movement but gives few degrees.',
            fat='Fat pad placement from Gray (1918, superficial fascia) and artistic anatomy (Richer, Artistic Anatomy, 1890); thickness from adult skinfold norms (half a skinfold), rounded.',
            plates='Plates drawn by tools/bodies/anatomy.py from these attachments: anatomical position, the canon man, right half drawn and mirrored.'),
        plates=dict(skeleton=['img/anatomy-skeleton-front.svg', 'img/anatomy-skeleton-back.svg', 'img/anatomy-skeleton-side.svg'],
                    muscles=['img/anatomy-muscles-front.svg', 'img/anatomy-muscles-back.svg', 'img/anatomy-muscles-side.svg']),
        bones=BONES, joints=JOINTS, muscles=MUSCLES, plate_index=PLATE_INDEX, fat=FAT, build_fat=BUILD_FAT, surface=SURFACE,
        measurements=dict(unit='heads (crown to chin); cm at the reference stature: man 175 cm (head 23.3 cm), woman 162 cm (head 21.9 cm)',
                          figures=measure(canon)),
        checklist=[dict(id=c[0], region=c[1], check=c[2], how=c[3], tolerance=c[4]) for c in CHECKLIST],
    )
    for key, ref in (('male-average', 175.0), ('female-average', 162.0)):
        f = data['measurements']['figures'][key]
        for r in f['rows']:
            r['cm'] = round(r['heads'] * ref / f['heads'], 1)
    for path in (os.path.join(DOCS, 'anatomy.json'), os.path.join(DIST, 'anatomy.json')):
        json.dump(data, open(path, 'w'), indent=1, ensure_ascii=False)
    json.dump(ex, open(os.path.join(DIST, 'gray-excerpts.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(BONES), 'bones', len(JOINTS), 'joints', len(MUSCLES), 'muscles', len(FAT), 'fat pads', len(CHECKLIST), 'checks')


if __name__ == '__main__':
    main()
