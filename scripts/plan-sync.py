"""Build a conservative missing-photo plan from complete source inventories."""
import argparse,collections,json,re,unicodedata
from pathlib import Path

def fields(card):
 text=re.sub(r'\r?\n[ \t]','',card.replace('\r\n','\n'))
 return [(line.split(':',1)[0].split(';',1)[0].split('.')[-1].upper(),line.split(':',1)[1]) for line in text.splitlines() if ':' in line]
def emails(card):return {v.strip().casefold() for k,v in fields(card) if k=='EMAIL' and v.strip()}
def norm(s):return ' '.join(unicodedata.normalize('NFKC',s or '').casefold().split())
def phone(s):
 # Do not guess country codes or strip extensions into another number.
 if re.search(r'[A-Za-z#;]',s):return ''
 value=re.sub(r'[^0-9]','',s)
 return value if len(value)>=10 else ''

def plan(local,source):
 li=collections.defaultdict(set);si=collections.defaultdict(set);lp=collections.defaultdict(set);sp=collections.defaultdict(set);byid={c['contactId']:c for c in source}
 for c in local:
  for e in emails(c['vcard']):li[e].add(c['id'])
  for k,v in fields(c['vcard']):
   if k=='TEL' and phone(v):lp[phone(v)].add(c['id'])
 for c in source:
  for e in c.get('contactData',{}).get('emails',[]):si[e['value'].strip().casefold()].add(c['contactId'])
  for e in c.get('contactData',{}).get('phoneNumbers',[]):
   if phone(e.get('value','')):sp[phone(e['value'])].add(c['contactId'])
 counts=collections.Counter();eligible=[];skipped=[]
 for c in local:
  reason=None;le=emails(c['vcard']);numbers={v for k,v in fields(c['vcard']) if k=='TEL' and phone(v)};kind='email' if le else 'phone';ids=set().union(*(si[e] for e in le)) if le else (set().union(*(sp[phone(v)] for v in numbers)) if numbers else set())
  if any(k=='PHOTO' for k,v in fields(c['vcard'])):reason='existing_photo'
  elif not le and not numbers:reason='no_match_identifier'
  elif not ids:reason='no_source_match'
  elif len(ids)!=1:reason='ambiguous_source'
  else:
   sc=byid[next(iter(ids))];data=sc['contactData'];name=data.get('name',{})
   unique=([e for e in sorted(le) if len(li[e])==1 and si[e]=={sc['contactId']}] if le else [v for v in sorted(numbers) if len(lp[phone(v)])==1 and sp[phone(v)]=={sc['contactId']}])
   if not unique:reason='shared_identifier'
   elif not (norm(c['first']) or norm(c['last'])) or (norm(c['first']),norm(c['last']))!=(norm(name.get('givenName')),norm(name.get('familyName'))):reason='name_mismatch'
   elif not data.get('photos') or not data['photos'][0].get('value'):reason='source_has_no_photo'
   else:
    eligible.append({'localId':c['id'],'sourceId':sc['contactId'],'sourceEtag':sc['etag'],'first':c['first'],'last':c['last'],'email':unique[0],'matchKind':kind,'photoUrl':data['photos'][0]['value']});counts['eligible']+=1
  if reason:counts[reason]+=1;skipped.append({'localId':c['id'],'reason':reason})
 return {'counts':dict(counts),'entries':eligible,'skipped':skipped}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--local',required=True);p.add_argument('--source',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 source=json.loads(Path(a.source).read_text());assert source['complete']
 result=plan(json.loads(Path(a.local).read_text()),source['contacts']);Path(a.output).write_text(json.dumps(result,indent=2));print(json.dumps(result['counts']))
