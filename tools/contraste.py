import zlib, struct, statistics, sys

def decode(p):
    d=open(p,'rb').read(); i=8; idat=b''
    while i<len(d):
        ln=struct.unpack('>I',d[i:i+4])[0]; typ=d[i+4:i+8]; data=d[i+8:i+8+ln]
        if typ==b'IHDR': w,h,bd,ct = struct.unpack('>IIBB',data[:10])
        elif typ==b'IDAT': idat+=data
        i+=12+ln
    raw=zlib.decompress(idat); bpp=3; stride=w*bpp
    prev=bytearray(stride); pos=0; rows=[]
    for y in range(h):
        f=raw[pos]; pos+=1
        line=bytearray(raw[pos:pos+stride]); pos+=stride
        for x in range(stride):
            a=line[x-bpp] if x>=bpp else 0
            b=prev[x]; c=prev[x-bpp] if x>=bpp else 0
            if f==1: line[x]=(line[x]+a)&255
            elif f==2: line[x]=(line[x]+b)&255
            elif f==3: line[x]=(line[x]+(a+b)//2)&255
            elif f==4:
                pa=abs(b-c); pb=abs(a-c); pc=abs(a+b-2*c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[x]=(line[x]+pr)&255
        rows.append(line); prev=line
    return w,h,rows

def lum(r,g,b):
    f=lambda c:(c/255)/12.92 if (c/255)<=0.04045 else (((c/255)+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)

def razao(L1,L2): return (max(L1,L2)+0.05)/(min(L1,L2)+0.05)

for arq in sys.argv[1:]:
    w,h,rows=decode(arq)
    # Mediana por linha: o fundo domina em área, o glifo é minoria.
    medianas=[]
    for y in range(int(h*0.36), int(h*0.92), 2):
        L=[lum(rows[y][x*3],rows[y][x*3+1],rows[y][x*3+2]) for x in range(int(w*0.10), int(w*0.92), 2)]
        medianas.append((statistics.median(L), y))
    pior, y = max(medianas)
    print(f'\n{arq}')
    print(f'  banda de fundo mais clara dentro do painel: L={pior:.4f} (linha y={y})')
    for nome,hexa in (('névoa #9ba1b3','#9ba1b3'),('gelo  #edeff5','#edeff5')):
        c=tuple(int(hexa[i:i+2],16) for i in (1,3,5)); r=razao(lum(*c), pior)
        st='OK' if r>=4.5 else ('limite' if r>=3 else 'REPROVA')
        print(f'  {nome} sobre ela: {r:.2f}:1  {st}')
