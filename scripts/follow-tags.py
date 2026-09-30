"""Add newly verified sync results to the Contacts+ list while one run is active."""
import argparse,json,os,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--run-dir',required=True);p.add_argument('--pid',type=int,required=True);a=p.parse_args();run=Path(a.run_dir).resolve()
tagfile=run/'tagged-ids.json';tagged=set(json.loads(tagfile.read_text())) if tagfile.exists() else set()
def alive():
 try:os.kill(a.pid,0);return True
 except ProcessLookupError:return False
for _ in range(960):
 running=alive();rows=[]
 for line in (run/'results.jsonl').read_text().splitlines():
  try:rows.append(json.loads(line))
  except json.JSONDecodeError:pass # Writer may be appending its last line.
 ids={x['localId'] for x in rows if x['status']=='verified'};pending=sorted(ids-tagged)
 if pending:
  manifest=run/'tag-next.txt';manifest.write_text('\n'.join(pending))
  result=subprocess.run(['osascript',str(ROOT/'scripts/tag-updated.applescript'),str(manifest),(run/'my-card-id.txt').read_text().strip()],capture_output=True,text=True,timeout=120)
  if result.returncode:
   (run/'tag-error.txt').write_text(result.stderr);raise SystemExit('List update stopped; inspect tag-error.txt')
  tagged.update(pending);tagfile.write_text(json.dumps(sorted(tagged)))
  print(json.dumps({'list':'Contacts+','tagged':len(tagged)}),flush=True)
 if not running:break
 time.sleep(30)
