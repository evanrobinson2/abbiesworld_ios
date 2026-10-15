import json,re,hashlib
from pathlib import Path
R=Path('outputs/noodle-house-multiplayer');P=R/'WindowsBuild';E=R/'evidence';saved=P/'AbbiesWorld/Saved'
log=Path('work/noodle-package-release.log').read_text(errors='replace');bad=re.findall(r'.*(?:Failed to compile Material|invalid ShaderMap|Sampler type|Error:).*',log)
assert 'ExitCode=0 (Success)' in log and not bad,bad
cal=json.loads((saved/'KitchenCalibrationResult.json').read_text());assert cal['passed'] and len(cal['shots'])==4
assert 'AW_CALIBRATION Down' in Path('work/noodle-packaged-calibration-release.log').read_text(errors='replace')
for s in cal['shots']:assert s['mesh_forward_matches_movement'] and s['carry_follows_facing'] and abs(s['plate_surface_gap_cm']-.6)<.1
assert (saved/'KitchenCalibrationResult.json').stat().st_mtime>(P/'AbbiesWorld/Binaries/Win64/AbbiesWorld.exe').stat().st_mtime
service=json.loads((E/'PackagedService.json').read_text());assert service['served']>=1 and service['missed']==0
h=json.loads((E/'PackagedRemoteCookHost.json').read_text());c=json.loads((E/'PackagedRemoteCookClient.json').read_text());assert h['served']==c['served']==2 and h['score']==c['score']==156 and c['snapshots']>500 and h['remote_commands']>0
gate=json.loads((E/'EncounterGateResult.json').read_text());assert gate['passed']==gate['total']==39
assert 'PreLogin failure: Restaurant session admission is unavailable.' in Path('work/noodle-admission-host.log').read_text(errors='replace')
manifest=(P/'Manifest_UFSFiles_Win64.txt').read_text(errors='replace');assert not re.search(r'Content[/\\](?:PrivateReferences|Overcooked2)',manifest,re.I)
content=Path('work/RestaurantProof/Content/AbbiesRestaurant');roles=['ChefAbbie','ChefDaddy','ChefMommy','Counter','NoodleBowl','BrothPot','Garnish','NoodleHouse'];assert all((content/('SM_'+n+'.uasset')).exists() for n in roles)
report={'name':"Abby and Ani's Noodle House",'status':'packaged_local_technical_proof_verified_not_integrated_online','engine':'5.4.4','package_material_shader_errors':bad,'packaged_service':service,'packaged_remote_cook_host':h,'packaged_remote_cook_client':c,'network_proof_scope':'separate localhost packaged processes with remote cooking RPCs; before final lighting-only rebuild; gameplay network methods unchanged','landing_gate':gate,'packaged_calibration':cal,'admission_without_dev_bypass':'rejected_verified','artist_mesh_roles':roles,'native_uassets':len(list(content.glob('*.uasset'))),'cooked_private_commercial_assets':0,'executable_sha256':hashlib.sha256((P/'AbbiesWorld/Binaries/Win64/AbbiesWorld.exe').read_bytes()).hexdigest(),'blocked_dependencies':['authoritative shared-world placement and completed-landing dispatcher','account-bound session broker and HTTPS API/Supabase activation','deployed host/relay and real-account/device internet verification','profile figurine binding, lifecycle/rewards/exact return adapter','human art acceptance and final modular/station/animation polish'],'overland_adapter_applied':False,'appearance_approved':False,'ipad_tested':False,'physical_controllers_tested':False}
(R/'verification.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'gate_checks':gate['passed'],'remote_served':c['served'],'shader_errors':len(bad),'native_uassets':report['native_uassets']}))
