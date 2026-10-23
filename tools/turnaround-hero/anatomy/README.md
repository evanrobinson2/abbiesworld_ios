# Anatomy check (AW-STUDY-0023)

`front-landmarks.json`: landmarks read by hand from `ref/hero-front.png` (about ±3 px; floor at row 486).
`score.json`: `python3 tools/bodies/score_body.py tools/turnaround-hero/anatomy/front-landmarks.json --build heroic`.

Findings (heroic canon, Bodies study): 9.5 heads (canon 8.5); chin, neck pit, shoulder and chest heights true;
shoulders +65%, chest +44%, waist +30%, hips true; crotch and knee about 0.5 head low; elbow 0.7 and fingertips
0.6 head low (long arms); ankle cuffs high (boot tops).

Rule for the model: joints and muscle placement follow anatomy (the canon); proportions follow him. Score the model
against him, and use the canon only to check that every joint is a real joint.
