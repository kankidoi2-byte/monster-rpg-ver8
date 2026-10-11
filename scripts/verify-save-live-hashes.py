import concurrent.futures, hashlib, json, pathlib, urllib.request

base = 'https://pactforge-studio.github.io/monster-rpg-ver8/'
sha = 'f50901dfd5c7d8c55b5afbfaa8924dcee67128d6'
expected_hashes = json.loads(pathlib.Path('scripts/save-live-hashes.json').read_text())
files = list(expected_hashes)
def check(path):
    relative = path
    req = urllib.request.Request(base+relative+'?release_verify='+sha, headers={'User-Agent':'MonsterRPG-release-verification','Cache-Control':'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as response:
        data = response.read()
        status = response.status
    expected = expected_hashes[relative]
    actual = hashlib.sha256(data).hexdigest()
    return {'path':relative,'status':status,'bytes':len(data),'expected':expected,'actual':actual,'match':expected==actual}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, files))
report = {'source':sha,'url':base,'files':len(results),'allMatch':all(r['match'] for r in results),'results':results}
pathlib.Path('artifacts').mkdir(exist_ok=True)
pathlib.Path('artifacts/save-public-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'source':sha,'files':len(results),'allMatch':report['allMatch'],'mismatches':[r['path'] for r in results if not r['match']]}))
raise SystemExit(0 if report['allMatch'] else 1)
