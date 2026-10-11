const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const OUT = process.argv[2] || path.join(__dirname, '..', 'assets');
const FPS = 6;
const W = 1320, H = 908;
const P = { bg:'#202120', sidebar:'#2b2d2b', emerald:'#123e32', gold:'#c7a34a', ivory:'#f4f0e6', muted:'#b9c1ba', line:'#4b514c', mint:'#83b49e', black:'#141915' };
const pairs = [
  { code:'EURUSD', direction:'short', name:'Euro / US Dollar', context:['Market context','Daily supply and demand'], structure:['Structural levels','Evidence before participation'], week:['Week-ahead preparation','Check the latest review first'], values:[108,112,115,111,114,108,97,96,89,87,82,84,72,66,62,67,54,48,45,50,43,40,44,47] },
  { code:'USDJPY', direction:'long', name:'US Dollar / Japanese Yen', context:['Market context','Daily supply and demand'], structure:['Structural levels','Evidence before participation'], week:['Week-ahead preparation','Check the latest review first'], values:[42,45,48,45,49,48,57,58,65,67,72,70,80,84,88,83,93,97,100,95,104,108,105,103] },
  { code:'GBPAUD', direction:'short', name:'British Pound / Australian Dollar', context:['Market context','Daily supply and demand'], structure:['Structural levels','Evidence before participation'], week:['Week-ahead preparation','Check the latest review first'], values:[106,111,114,112,115,109,100,97,90,93,85,78,82,70,66,71,59,53,56,47,42,45,40,44] }
];
const STARTS = [2.7,7.7,12.7];
function position(i){
  return pairs[i].direction==='long' ? {stop:525,entry:485,target:365} : {stop:365,entry:405,target:525};
}
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function txt(x,y,s,size=25,fill=P.ivory,weight=400,extra=''){ return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" ${extra}>${esc(s)}</text>`; }
function rect(x,y,w,h,fill,rx=0,stroke='none',sw=1){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;}
function line(x1,y1,x2,y2,color=P.line,sw=1){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}"/>`;}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function cursor(t){
  const stops = [
    {a:0,b:1.2,p:[1120,746],q:[1120,746]},
    {a:1.2,b:1.8,p:[1120,746],q:[270,407]},
    {a:1.8,b:2.0,p:[270,407],q:[270,407]},
    {a:2.0,b:2.7,p:[270,407],q:[260,471]}
  ];
  for(let i=0;i<pairs.length;i++){
    const a=STARTS[i],end=STARTS[i+1]||18,{entry,target}=position(i);
    stops.push(
      {a,b:a+.45,p:[260,471+i*58],q:[668,entry]},
      {a:a+.45,b:a+.65,p:[668,entry],q:[668,entry]},
      {a:a+.65,b:a+1.45,p:[668,entry],q:[1114,target]},
      {a:a+1.45,b:a+1.8,p:[1114,target],q:[1114,target]},
      {a:a+1.8,b:a+2.2,p:[1114,target],q:[1225,610]},
      {a:a+2.2,b:end-.8,p:[1225,610],q:[1225,610]},
      {a:end-.8,b:end,p:[1225,610],q:i<2?[260,471+(i+1)*58]:[1225,610]}
    );
  }
  const s = stops.find(s=>t>=s.a&&t<s.b)||stops.at(-1), k=ease((t-s.a)/(s.b-s.a));
  const x=s.p[0]+(s.q[0]-s.p[0])*k,y=s.p[1]+(s.q[1]-s.p[1])*k;
  let pulse=''; for(const click of [1.8,...STARTS,...STARTS.map(a=>a+.45)]){const d=t-click;if(d>=0&&d<0.55)pulse+=`<circle cx="${x}" cy="${y}" r="${10+35*d}" fill="none" stroke="${P.gold}" stroke-width="4" opacity="${1-d/0.55}"/>`;}
  return `${pulse}<g transform="translate(${x.toFixed(2)},${y.toFixed(2)})"><path d="M0 0 L0 31 L8 23 L15 39 L22 35 L15 20 L28 20 Z" fill="#fffdf6" stroke="#0b1610" stroke-width="2.4"/></g>`;
}
function chart(i,t){
  const pair=pairs[i], begin=STARTS[i];
  const n=Math.min(pair.values.length,Math.floor(6+18*ease((t-begin-1.1)/2.6)));
  const cx=453,cy=344,cw=767,ch=205;
  let s=rect(cx,cy,cw,ch,P.black,2);
  for(let k=0;k<6;k++)s+=line(cx,cy+ch*k/5,cx+cw,cy+ch*k/5,'#27362c');
  for(let k=0;k<13;k++)s+=line(cx+cw*k/12,cy,cx+cw*k/12,cy+ch,'#27362c');
  s+=rect(cx,cy+13,cw,30,'#3e3723',0,P.gold,1.2)+txt(cx+12,cy+35,'SUPPLY',16,P.gold,600);
  s+=rect(cx,cy+ch-39,cw,33,'#183b30',0,P.mint,1.2)+txt(cx+12,cy+ch-16,'DEMAND',16,P.mint,600);
  if(t>=begin+.45){
    const x=668,{stop,entry,target}=position(i);
    const right=x+446*ease((t-begin-.45)/1), width=right-x;
    const opacity=ease((t-begin-.45)/.3);
    s+=`<g opacity="${opacity}" data-position-tool="${pair.direction}">`;
    s+=rect(x,Math.min(stop,entry),width,Math.abs(entry-stop),P.gold,0,'#dbc17c',1.3).replace('/>',' fill-opacity="0.26"/>');
    s+=rect(x,Math.min(entry,target),width,Math.abs(target-entry),pair.direction==='long'?'#4eaa87':'#afb4b0',0,'#c6cec7',1.3).replace('/>',' fill-opacity="0.26"/>');
    s+=line(x,entry,right,entry,P.ivory,2);
    s+=`<line x1="${x}" y1="${entry}" x2="${right}" y2="${target}" stroke="#c6cec7" stroke-width="1.5" stroke-dasharray="7 7"/>`;
    if(t>=begin+1.6){
      for(const [y,label,fill,ink] of [[stop,'STOP',P.gold,'#171a15'],[entry,'ENTRY','#78847c',P.ivory],[target,'TARGET',P.ivory,'#171a15']]){
        s+=rect(1122,y-12,91,24,fill,2)+txt(1167.5,y+5,label,16,ink,700,'text-anchor="middle"');
      }
    }
    s+='</g>';
  }
  const bottom=cy+ch-44, range=ch-73;
  for(let k=0;k<n;k++){
    const prev=k?pair.values[k-1]:pair.values[0]-5,v=pair.values[k],base=Math.min(prev,v),top=Math.max(prev,v);
    const yb=bottom-(base-35)/84*range,yt=bottom-(top-35)/84*range;
    const x=cx+38+k*29.5,c=v>=prev?P.mint:P.gold;
    s+=line(x,yt-7,x,yb+8,c,1.8)+rect(x-7.4,yt,14.8,Math.max(4,yb-yt),c);
  }
  return s;
}
function frame(t){
  const active=t>=12.7?2:t>=7.7?1:t>=2.7?0:-1, expanded=t>=1.8;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g font-family="DejaVu Sans,Arial,sans-serif">`;
  s+=rect(0,0,W,H,P.bg)+rect(0,0,W,40,'#071e2c');
  s+=txt(22,28,'TGI MEMBER PORTAL · OPERATING DESK',21,P.ivory,500);
  s+=rect(0,40,W,66,P.emerald)+txt(24,81,'‹  Go to Dashboard',21,P.ivory,400);
  s+=txt(W/2,85,'TGI',43,P.gold,400,'text-anchor="middle" font-family="DejaVu Serif,serif"');
  s+=rect(0,106,364,H-168,P.sidebar)+line(363,106,363,H-62,'#778278',2);
  s+=rect(15,122,334,107,'#202320',3)+txt(30,165,'Trader Growth',29,P.ivory,600)+txt(30,203,'Institute Membership',27,P.ivory,600);
  s+=rect(25,242,315,34,'#333833',3,'#5a625b')+txt(37,266,'Search by lesson title',17,P.muted)+txt(313,266,'⌄',19,P.muted);
  const sections=[['Current Desk',303],['Start Here',346],['News & Releases',389]];
  for(const [title,y] of sections){s+=`<circle cx="29" cy="${y-8}" r="9" fill="none" stroke="#788279" stroke-width="2"/>`+txt(54,y,title,24,P.ivory,title==='Current Desk'&&active<0?600:400)+line(20,y+13,342,y+13);}
  s+=rect(18,407,327,45,expanded?P.emerald:P.sidebar,3)+txt(52,439,'Forex',26,P.ivory,600)+txt(268,438,'33',20,P.muted)+txt(312,438,expanded?'⌃':'⌄',22,P.muted);
  if(expanded){
    for(let k=0;k<3;k++){const y=454+k*58,sel=k===active;s+=rect(35,y,309,49,sel?P.emerald:P.sidebar,3,sel?P.gold:'none',1.5)+txt(60,y+35,pairs[k].code,30,sel?P.ivory:P.muted,sel?700:500);}
    s+=txt(60,656,'+ 30 more currency pairs',18,P.muted);
  }
  const navY=expanded?704:509;
  for(const [k,title,count] of [[0,'Indices','4'],[1,'Commodities','4'],[2,'Crypto','2']]){const y=navY+k*43;s+=`<circle cx="29" cy="${y-8}" r="9" fill="none" stroke="#788279" stroke-width="2"/>`+txt(54,y,title,23,P.ivory)+txt(275,y,count,19,P.muted)+txt(312,y,'⌄',21,P.muted)+line(20,y+13,342,y+13);}
  s+=rect(365,106,955,53,'#1b1f1c')+txt(395,141,active<0?'CURRENT DESK | Start Here Today':`FOREX | ${pairs[active].code}`,24,P.ivory,500)+line(365,159,W,159);
  if(active<0){
    s+=txt(410,234,'Find your market.',46,P.ivory,600)+txt(410,291,'Follow the preparation.',46,P.gold,600);
    s+=txt(410,354,'43 permanent instrument pages',31,P.ivory,500)+txt(410,391,'Currencies · Indices · Commodities · Crypto',24,P.muted);
    s+=rect(410,437,846,119,'#27352d',8,'#526a5a')+txt(440,480,'Preview: Instrument pages',31,P.ivory,600)+txt(440,521,'This animation previews the layout and navigation.',23,P.muted);
    s+=txt(410,622,'Open Forex, then choose a currency pair.',29,P.ivory,500);
    s+=rect(410,661,262,106,'#1a2b23',6,P.line)+txt(434,703,'33',36,P.gold,600)+txt(434,741,'FOREX PAIRS',21,P.ivory,600);
    s+=rect(696,661,264,106,'#1a2b23',6,P.line)+txt(720,703,'Video + details',25,P.ivory,600)+txt(720,741,'One instrument page',20,P.muted);
    s+=rect(984,661,272,106,'#1a2b23',6,P.line)+txt(1008,703,'Check the date',25,P.ivory,600)+txt(1008,741,'Before relying on a view',19,P.muted);
  }else{
    const p=pairs[active];
    s+=txt(410,220,p.code,49,P.ivory,700)+txt(641,218,p.name,25,P.muted,400);
    s+=txt(410,253,'Daily Zones · Structural levels · Week-ahead preparation',23,P.muted);
    s+=rect(410,282,847,345,'#0f1712',6,'#67745f',1.1)+txt(435,320,p.code+' · VIDEO PREVIEW',24,P.ivory,600);
    s+=txt(1232,318,p.direction.toUpperCase()+' POSITION',18,P.gold,600,'text-anchor="end"');
    s+=chart(active,t);
    s+=rect(412,565,843,60,'#14251b',0)+`<path d="M438 583 L438 606 M449 583 L449 606" stroke="${P.ivory}" stroke-width="5"/>`+txt(470,602,'Entry · Stop · Target',21,P.ivory,500);
    s+=rect(921,594,288,4,'#3a4e3e',2)+rect(921,594,288*Math.min(1,(t-[2.7,7.7,12.7][active])/4.2),4,P.gold,2);
    const cards=[['Daily Zones',p.context],['Structure',p.structure],['Week ahead',p.week]];
    for(let k=0;k<3;k++){const x=410+k*285;s+=rect(x,653,277,134,'#26372b',6,'#4d6252')+txt(x+17,688,cards[k][0],25,P.ivory,600)+txt(x+17,724,cards[k][1][0],20,P.muted)+txt(x+17,755,cards[k][1][1],17,P.muted);}
    s+=txt(410,824,'Layout preview only — no current market assessment.',22,P.muted,400);
  }
  s+=rect(0,H-62,W,62,'#071e16')+line(0,H-62,W,H-62,P.gold,2)+txt(W/2,H-24,'TGI OPERATING DESK',29,P.ivory,600,'text-anchor="middle"');
  s+=cursor(t)+`</g></svg>`;
  return s;
}
async function main(){
  await fs.mkdir(OUT,{recursive:true});
  const frames=await fs.mkdtemp(path.join(os.tmpdir(),'tgi-portal-frames-'));
  try {
    for(let n=0;n<18*FPS;n++){
      const svg=frame(n/FPS);
      if(/\b(illustrative|sample)\b/i.test(svg))throw new Error('Unexpected preview label');
      await fs.writeFile(path.join(frames,String(n).padStart(4,'0')+'.svg'),svg);
    }
    execFileSync('ffmpeg',['-y','-v','error','-framerate',String(FPS),'-i',path.join(frames,'%04d.svg'),'-filter_complex','scale=960:660:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff:reserve_transparent=0[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle','-gifflags','+transdiff','-loop','0',path.join(OUT,'tgi-forex-portal-walkthrough.gif')],{stdio:'inherit'});
    execFileSync('ffmpeg',['-y','-v','error','-i',path.join(frames,'0000.svg'),'-vf','scale=960:660','-frames:v','1','-quality','90',path.join(OUT,'tgi-forex-portal-walkthrough-poster.webp')],{stdio:'inherit'});
    if(process.env.TGI_PORTAL_QA_DIR){
      await fs.mkdir(process.env.TGI_PORTAL_QA_DIR,{recursive:true});
      for(const n of [0,21,26,33,43,53,63,85,93,105])execFileSync('ffmpeg',['-y','-v','error','-i',path.join(frames,String(n).padStart(4,'0')+'.svg'),'-vf','scale=960:660','-frames:v','1',path.join(process.env.TGI_PORTAL_QA_DIR,`frame-${n}.png`)],{stdio:'inherit'});
    }
  } finally {
    await fs.rm(frames,{recursive:true,force:true});
  }
  console.log('Rendered the 18-second portal GIF and matching poster at 960 x 660.');
}
main().catch(e=>{console.error(e);process.exit(1);});
