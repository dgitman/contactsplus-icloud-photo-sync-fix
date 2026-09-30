"""Back up a complete Contacts+ source inventory without changing contacts."""
import argparse,json,subprocess,time
from pathlib import Path
from urllib.request import Request,urlopen

def main():
 p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 config=json.loads(Path(a.config).read_text());item=json.loads(subprocess.check_output(['op','item','get',config['oauth_item'],'--format','json'],timeout=90))
 token=next(f['value'] for f in item['fields'] if f['id']=='credential')
 contacts=[];seen=set();cursor=None;pages=0
 while True:
  body={'size':500,'includeDeletedContacts':False}
  if cursor:body['scrollCursor']=cursor
  req=Request('https://api.contactsplus.com/api/v1/contacts.scroll',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
  with urlopen(req,timeout=60) as r:data=json.load(r)
  for c in data['contacts']:
   if c['contactId'] in seen:raise ValueError('Repeated source ID')
   seen.add(c['contactId']);contacts.append(c)
  pages+=1;print(json.dumps({'pages':pages,'contacts':len(contacts)}),flush=True)
  cursor=data.get('cursor')
  if not cursor:break
  if pages>500:raise ValueError('Unexpected pagination')
  time.sleep(.1)
 Path(a.output).write_text(json.dumps({'complete':True,'contacts':contacts},indent=2))
if __name__=='__main__':main()
