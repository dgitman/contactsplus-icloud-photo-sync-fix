import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name,file):
 s=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
p=load('plan','plan-sync.py');r=load('runner','run-sync.py')
class SyncTests(unittest.TestCase):
 def setUp(self):
  self.local={'id':'local','first':'Example','last':'Person','vcard':'BEGIN:VCARD\nEMAIL:person@example.com\nNOTE:Keep this\nEND:VCARD'}
  self.source={'contactId':'source','etag':'v1','contactData':{'name':{'givenName':'Example','familyName':'Person'},'emails':[{'value':'person@example.com'}],'photos':[{'value':'https://img.contactsplus.com/example'}]}}
 def test_unique_match(self):self.assertEqual(len(p.plan([self.local],[self.source])['entries']),1)
 def test_existing_photo_skipped(self):
  self.local['vcard']+='\nPHOTO;ENCODING=b:abc';self.assertFalse(p.plan([self.local],[self.source])['entries'])
 def test_shared_local_email_skipped(self):self.assertFalse(p.plan([self.local,{**self.local,'id':'other'}],[self.source])['entries'])
 def test_ambiguous_source_skipped(self):self.assertFalse(p.plan([self.local],[self.source,{**self.source,'contactId':'other'}])['entries'])
 def test_mismatched_name_skipped(self):
  self.source['contactData']['name']['givenName']='Someone';self.assertFalse(p.plan([self.local],[self.source])['entries'])
 def test_nonphoto_changes_detected(self):
  before='BEGIN:VCARD\nNOTE:Keep this\nREV:old\nEND:VCARD'
  after='BEGIN:VCARD\nNOTE:Keep this\nPHOTO;ENCODING=b:abc\n def\nREV:new\nEND:VCARD'
  self.assertEqual(r.canonical(before),r.canonical(after));self.assertNotEqual(r.canonical(before),r.canonical(after.replace('Keep this','Changed')))

class PhoneMatchingTests(SyncTests):
 def test_unique_phone_without_email(self):
  self.local['vcard']='BEGIN:VCARD\nTEL:+1 (212) 555-0100\nEND:VCARD'
  self.source['contactData']['emails']=[];self.source['contactData']['phoneNumbers']=[{'value':'+12125550100'}]
  entries=p.plan([self.local],[self.source])['entries'];self.assertEqual(len(entries),1);self.assertEqual(entries[0]['matchKind'],'phone')
 def test_shared_phone_skipped(self):
  self.local['vcard']='BEGIN:VCARD\nTEL:+1 (212) 555-0100\nEND:VCARD'
  self.source['contactData']['phoneNumbers']=[{'value':'+12125550100'}]
  self.assertFalse(p.plan([self.local,{**self.local,'id':'other'}],[self.source])['entries'])
 def test_phone_extension_not_guessed(self):self.assertEqual(p.phone('+1 212 555 0100 ext 3'),'')
