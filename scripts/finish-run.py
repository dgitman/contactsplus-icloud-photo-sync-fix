"""Finish newly prepared entries and verify one active on-demand sync run."""
import argparse,json,os,subprocess,time
from pathlib import Path
from tag_results import parse_results
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--run-dir',required=True);p.add_argument('--pid',type=int,required=True);p.add_argument('--config',required=True);p.add_argument('--plan',required=True);a=p.parse_args();run=Path(a.run_dir).resolve()
def alive():
 try:os.kill(a.pid,0);return True
 except ProcessLookupError:return False
while alive():time.sleep(10)
rows=[json.loads(x) for x in (run/'results.jsonl').read_text().splitlines()]
if any(x['status']=='failed' for x in rows):raise SystemExit('Run stopped with a failure; no automatic retry')
# Newly prepared photos are not part of the already-running process's in-memory list.
result=subprocess.run(['python3',str(ROOT/'scripts/run-sync.py'),'--config',a.config,'--plan',a.plan,'--run-dir',str(run),'--apply','--prepared'])
if result.returncode:raise SystemExit('Final photo batch stopped; no automatic retry')
rows=[json.loads(x) for x in (run/'results.jsonl').read_text().splitlines()];ids=[x['localId'] for x in rows if x['status']=='verified'];manifest=run/'tag-final.txt';manifest.write_text('\n'.join(ids))
tag_result=subprocess.run(['osascript',str(ROOT/'scripts/tag-updated.applescript'),str(manifest),(run/'my-card-id.txt').read_text().strip()],check=True,capture_output=True,text=True,timeout=600)
tagged,deferred=parse_results(tag_result.stdout,ids)
(run/'tag-deferred-ids.json').write_text(json.dumps(sorted(deferred)))
(run/'tagged-ids.json').write_text(json.dumps(sorted(tagged)))
inventory=run/'inventory-after.json'
subprocess.run(['osascript','-l','JavaScript',str(ROOT/'scripts/inventory.js'),str(inventory)],check=True,timeout=300)
import importlib.util
spec=importlib.util.spec_from_file_location('plan',ROOT/'scripts/plan-sync.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
current={x['id']:x for x in json.loads(inventory.read_text())}
missing=[i for i in ids if i not in current or not any(k=='PHOTO' for k,v in module.fields(current[i]['vcard']))]
report={'status':'complete' if not missing and not deferred else 'verification_failed','verifiedUpdates':len(ids),'skippedUpdates':sum(x['status']=='skipped' for x in rows),'tagged':len(tagged),'deferredListIds':sorted(deferred),'missingOnFinalRead':missing,'preparedSkipped':len(json.loads((run/'prepared.json').read_text())['skipped'])}
(run/'final-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
