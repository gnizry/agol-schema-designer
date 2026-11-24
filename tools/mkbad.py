import re,sys,glob,os
src,dst=sys.argv[1],sys.argv[2]
os.makedirs(dst,exist_ok=True)
pat=re.compile(r'<path id="([^"]+)" d="([^"]+)"([^>]*)/>')
def box(d):
    n=[float(x) for x in re.findall(r'-?\d+\.?\d*',d)]
    xs=n[0::2];ys=n[1::2]
    return min(xs),min(ys),max(xs),max(ys)
cnt=0
for f in glob.glob(src+'/im-*.svg'):
    s=open(f,encoding='utf8').read()
    def rep(m):
        global cnt
        i,d,a=m.groups()
        x0,y0,x1,y1=box(d)
        w,h=x1-x0,y1-y0
        sz=(17 if h<=50 else 26)
        bx,by=x0+3,y0+3
        if h<sz+8: by=y0+(h-sz)/2
        bd='M%g %g H%g V%g H%g Z'%(bx,by,bx+sz,by+sz,bx)
        cnt+=1
        return ('<path d="%s"%s/>'%(d,a))+('<path id="%s" d="%s" fill="#fde8e6" stroke="#c0392b" stroke-width="2.5"/>'%(i,bd))+('<text x="%g" y="%g" font-family="Arial, sans-serif" font-size="%d" font-weight="bold" text-anchor="middle" fill="#c0392b" pointer-events="none">X</text>'%(bx+sz/2,by+sz/2+sz*0.33,int(sz*0.8)))
    t=pat.sub(rep,s)
    t=t.replace('סמן כל כנף שקיימת ברמה זו, ואת הפיקטוגרמות שעליה','סמן X ליד כל כנף או פיקטוגרמה שאינה תקינה').replace('סמן כל כנף שקיימת ברמה זו','סמן X ליד כל כנף שאינה תקינה')
    open(os.path.join(dst,os.path.basename(f).replace('im-','iv-',1)),'w',encoding='utf8').write(t)
print(cnt,'regions')
