"""Prepare primary source photos, then apply missing-photo updates serially."""
import argparse,collections,concurrent.futures,hashlib,json,os,re,subprocess,time
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[1]
def canonical(card):
 text=re.sub(r'\r?\n[ \t]','',card.replace('\r\n','\n'))
 return sorted(line for line in text.splitlines() if line and line.split(':',1)[0].split(';',1)[0].split('.')[-1].upper() not in {'PHOTO','REV'})
def main():
 p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--plan',required=True);p.add_argument('--run-dir',required=True);p.add_argument('--apply',action='store_true');p.add_argument('--limit',type=int);a=p.parse_args()
 run=Path(a.run_dir).resolve();run.mkdir(parents=True,exist_ok=True);(run/'images').mkdir(exist_ok=True);(run/'backups').mkdir(exist_ok=True)
 entries=json.loads(Path(a.plan).read_text())['entries'];entries=entries[:a.limit] if a.limit else entries
 config=json.loads(Path(a.config).read_text());item=json.loads(subprocess.check_output(['op','item','get',config['oauth_item'],'--format','json'],timeout=90));token=next(f['value'] for f in item['fields'] if f['id']=='credential')
 def api(ids):
  req=Request('https://api.contactsplus.com/api/v1/contacts.get',data=json.dumps({'contactIds':ids}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
  for attempt in range(4):
   try:
    with urlopen(req,timeout=60) as r:return json.load(r)['contacts']
   except HTTPError as e:
    if e.code!=429 or attempt==3:raise
    time.sleep(min(30,int(e.headers.get('Retry-After','5'))))
 eligible=[];skips=[]
 for i in range(0,len(entries),100):
  batch=entries[i:i+100];current={x['contactId']:x for x in api([e['sourceId'] for e in batch])}
  for e in batch:
   c=current.get(e['sourceId']);photos=c.get('contactData',{}).get('photos',[]) if c else []
   if not c or c.get('etag')!=e['sourceEtag'] or not photos or photos[0].get('value')!=e['photoUrl']:
    skips.append({'localId':e['localId'],'reason':'source_changed'});continue
   eligible.append(e)
  print(json.dumps({'stage':'source_recheck','checked':min(i+100,len(entries)),'eligible':len(eligible)}),flush=True)
 def prepare(e):
  key=hashlib.sha256(e['localId'].encode()).hexdigest()[:24];url=e['photoUrl']
  if urlparse(url).scheme!='https' or urlparse(url).hostname!='img.contactsplus.com':raise ValueError('Unsupported image host')
  raw=run/'images'/(key+'.original');tiff=run/'images'/(key+'.tiff')
  if not tiff.exists():
   with urlopen(url,timeout=60) as r:data=r.read(20*1024*1024+1)
   if len(data)>20*1024*1024:raise ValueError('Image too large')
   raw.write_bytes(data)
   subprocess.run(['sips','-s','format','tiff',str(raw),'--out',str(tiff)],check=True,capture_output=True,timeout=60)
   dims=subprocess.check_output(['sips','-g','pixelWidth','-g','pixelHeight',str(tiff)],text=True,timeout=30)
   if len(re.findall(r'pixel(?:Width|Height): \d+',dims))!=2:raise ValueError('Invalid image')
  return {**e,'key':key,'tiff':str(tiff)}
 prepared=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  futures={pool.submit(prepare,e):e for e in eligible}
  for f in concurrent.futures.as_completed(futures):
   try:prepared.append(f.result())
   except Exception as ex:skips.append({'localId':futures[f]['localId'],'reason':'image_unavailable','errorType':type(ex).__name__})
   if (len(prepared)+len(skips))%100==0:print(json.dumps({'stage':'download','prepared':len(prepared),'skipped':len(skips)}),flush=True)
 (run/'prepared.json').write_text(json.dumps({'entries':prepared,'skipped':skips},indent=2));print(json.dumps({'stage':'prepared','count':len(prepared),'skipped':len(skips)}),flush=True)
 if not a.apply:return
 report=run/'results.jsonl';done={}
 if report.exists():
  done={x['localId']:x for x in map(json.loads,report.read_text().splitlines())}
 verified=sum(x['status']=='verified' for x in done.values())
 with report.open('a',buffering=1) as log:
  for e in prepared:
   if e['localId'] in done:continue
   backup=run/'backups'/(e['key']+'.vcf')
   if backup.exists():raise RuntimeError('Unresolved prior attempt; inspect backup before continuing')
   result=subprocess.run(['osascript',str(ROOT/'scripts/set-missing-photo.applescript'),e['localId'],e['tiff'],str(backup),e['first'],e['last'],e['email'],e.get('matchKind','email')],text=True,capture_output=True,timeout=120)
   status='failed';reason=None
   if result.returncode==0 and Path(str(backup)+'.after.vcf').exists():
    before=backup.read_text();after=Path(str(backup)+'.after.vcf').read_text()
    if canonical(before)!=canonical(after):reason='non_photo_fields_changed'
    elif not re.search(r'(?:^|[\r\n])(?:item\d+\.)?PHOTO[;:]',after,re.I):reason='missing_readback_photo'
    else:status='verified';verified+=1
   elif 'Existing photo' in result.stderr:status='skipped';reason='photo_already_present'
   else:reason='save_failed'
   record={'localId':e['localId'],'sourceId':e['sourceId'],'status':status,'reason':reason}
   log.write(json.dumps(record)+'\n');log.flush();os.fsync(log.fileno())
   if status=='failed':
    (run/(e['key']+'.error.txt')).write_text(result.stderr)
    print(json.dumps({'stage':'stopped','verified':verified,'reason':reason}),flush=True);raise SystemExit(1)
   if verified%25==0:print(json.dumps({'stage':'applying','verified':verified}),flush=True)
 print(json.dumps({'stage':'complete','verified':verified,'preparationSkipped':len(skips)}),flush=True)
if __name__=='__main__':main()
