import analyze_video as a
from PIL import ImageChops, ImageStat
import json
# Windows established through the timestamped overview sheets.
windows=[(1930,1970),(2420,2440),(4080,4100),(4280,4300),(4620,4640),(5120,5160),(6200,6220),(6780,6810),(8000,8020),(8420,8440),(8730,8745),(8760,8775),(9720,9780),(9780,9840),(10380,10400),(10500,10520),(11160,11180),(12640,12680),(13100,13120)]
results=[]
for lo,hi in windows:
    previous=None
    scores=[]
    a.container.seek(int(lo / a.stream.time_base),stream=a.stream,backward=True)
    last=-1
    for frame in a.container.decode(a.stream):
        t=frame.time
        if t is None or t<lo: continue
        if t>hi: break
        if t-last<0.2: continue
        last=t
        im=frame.to_image().resize((64,48)).convert('RGB')
        if previous:
            score=sum(ImageStat.Stat(ImageChops.difference(previous,im)).mean)
            scores.append((score,t))
        previous=im
    best=sorted(scores,reverse=True)[:3]
    results.append({'window':[lo,hi],'candidates':[(round(t,2),round(s,1)) for s,t in best]})
print(json.dumps(results,indent=2))
open('analysis/boundary-candidates.json','w').write(json.dumps(results,indent=2))
times=[t for r in results for t in [max(0,r['candidates'][0][0]-0.5),r['candidates'][0][0]+0.5]]
for n in range(0,len(times),24): a.sheet(times[n:n+24],f'cuts-{n//24+1}.jpg')
