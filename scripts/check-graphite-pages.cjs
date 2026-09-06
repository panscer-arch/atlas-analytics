// Read-only LOCAL visual regression sweep. Fixtures never leave the test browser.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL}=require('node:url');
const boards = [
  'parser','marketingOS','sessionQueue','hermesAssistant','expenses','contributions','tables','team','departments','diary',
  'influencers','atlasCreatives','reelsCampaign','utmBuilder','hyipParser','telegramParser','instagramInfluencers','youtubeApiSearch','bitnestYoutube','articlePlacement','marketSegments','regionalHiring','mlmLeaders','mlmGateway','segmentOutreach','socialParser','web3Segments','poolMonitor','listings',
  'contentPlan','funnel','atlasPages','landings','images','materials','presentation','agentTasks','agentDataset','agentFaq','ceoPresentation','whitePaper','atlasInstructions','legalDocs','videoGenerator','videoScripts','toolRadar','terminology','localization','securityReview','codexSystem',
  'analytics','analytics-ga4','analytics-overview','analytics-traffic','analytics-products','analytics-reinvest','analytics-base','analytics-leaders','analytics-geography','analytics-partner','analytics-wallets','contracts',
  'inboxTasks','launch','launchCalendar','marketing','knowledgeBase','ideas','dailyTasks','socialSubscriptions','productLibrary','developments','crmBoard','taskMonitor',
];
const shots = new Set(['parser','influencers','atlasCreatives','reelsCampaign','tables','team','departments','marketingOS','hermesAssistant','materials','expenses','toolRadar','listings','contentPlan','diary','analytics']);
const outputDir = '/tmp/supersus-graphite-pages';
fs.mkdirSync(outputDir,{recursive:true});

function inspectPaint() {
  const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
  const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
  const roots=[...document.querySelectorAll('.sus-content-theme')];
  const host=document.querySelector('.analytics-listings-crm-host');
  if(host?.shadowRoot) roots.push(host.shadowRoot);
  const bright=[], lowContrast=[];
  for(const root of roots) for(const e of root.querySelectorAll('*')) {
    if(e.closest('svg,option,progress,[disabled],[aria-disabled=true],[class*="content-slide-"],[class*="preview"]'))continue;
    const r=e.getBoundingClientRect();
    if(r.width<8||r.height<8||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
    const c=getComputedStyle(e), bg=rgb(c.backgroundColor);
    if(c.visibility==='hidden'||Number(c.opacity)<.8)continue;
    if(bg.length>=3&&(bg[3]??1)>.8&&Math.min(...bg.slice(0,3))>185&&r.width*r.height>8000)bright.push(e.className||e.tagName);
    if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
    if(e.closest('button:disabled')||Number(c.fontSize.replace('px',''))<11)continue;
    let background=[17,19,24]; let n=e;
    for(;n;n=n.parentElement){const b=rgb(getComputedStyle(n).backgroundColor); if(b.length>=3&&(b[3]??1)>.95){background=b;break;}}
    const foreground=rgb(c.color); if(foreground.length<3)continue;
    const a=foreground[3]??1;const fg=foreground.slice(0,3).map((v,i)=>v*a+background[i]*(1-a));
    const ratio=(Math.max(lum(fg),lum(background))+.05)/(Math.min(lum(fg),lum(background))+.05);
    const threshold=parseFloat(c.fontSize)>=24||(parseFloat(c.fontSize)>=18.66&&Number(c.fontWeight)>=700)?3:4.5;
    if(ratio<threshold-.05)lowContrast.push({class:typeof e.className==='string'?e.className:e.tagName,ratio:+ratio.toFixed(2),fg:c.color,bg:background.slice(0,3)});
  }
  return {bright:[...new Set(bright)].slice(0,12),lowContrast:lowContrast.slice(0,15),overflow:document.documentElement.scrollWidth>innerWidth+1};
}

(async()=>{
  const {createTablesSeed}=await import(pathToFileURL(path.resolve('src/modules/analytics/data/tablesModel.js')));
  const {TEAM_KEY}=await import(pathToFileURL(path.resolve('src/modules/analytics/data/departmentsModel.js')));
  const browser=await chromium.launch();
  const context=await browser.newContext();
  await context.route('**/api/**',async route=>{
    const request=route.request(), url=new URL(request.url());
    let payload={ok:false,error:'Local visual QA: unavailable service'};let status=503;
    if(request.method()==='GET'&&url.pathname.startsWith('/api/content/')) {
      const key=decodeURIComponent(url.pathname.slice('/api/content/'.length));status=200;payload={ok:true,exists:false};
      if(key==='supersus.tables.v1')payload={ok:true,exists:true,value:createTablesSeed()};
      if(key===TEAM_KEY)payload={ok:true,exists:true,value:{nodes:[{id:'qa-person',type:'person',data:{label:'QA participant',role:'Reviewer'},position:{x:0,y:0}},{id:'qa-project',type:'project',data:{label:'QA project',category:'product'},position:{x:100,y:100}}],edges:[]}};
      if(key==='google-analytics')payload={ok:true,configured:true,propertyId:'LOCAL-QA',rangeLabel:'Local fixture',current:{activeUsers:10,newUsers:4,sessions:15,engagedSessions:9,engagementRate:.6,eventCount:25,averageEngagementSeconds:80,keyEvents:2,screenPageViews:20},changes:{},realtime:{activeUsers:1},trend:[],insights:[],sources:[],landingPages:[],countries:[],devices:[]};
    }else if(request.method()==='GET'&&url.pathname==='/api/marketing/browser-session'){status=200;payload={ok:true,authorized:true};}
    else if(request.method()==='GET'&&url.pathname==='/api/marketing/listings-crm/bootstrap'){status=200;payload={ok:true,data:{members:[],records:[],tasks:[],events:[],canEdit:false}};}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)});
  });
  const results=[];
  let index=0;
  await Promise.all([0,1].map(async()=>{
    const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
    while(index<boards.length){const board=boards[index++];errors=[];
      await page.setViewportSize({width:1440,height:1100});
      await page.goto('http://127.0.0.1:4181/?board='+board,{waitUntil:'domcontentloaded'});
      await page.locator('.sus-header').waitFor();await page.waitForTimeout(220);
      if(!await page.locator('main.sus-workspace').count()){
        results.push({board,resolved:board,desktop:{bright:[],lowContrast:[]},mobile:{bright:[],lowContrast:[]},errors:[...errors,'Workspace unmounted']});
        fs.writeFileSync(path.join(outputDir,'report.json'),JSON.stringify(results,null,2));
        console.log(board,'UNMOUNTED',errors);continue;
      }
      assert.equal(await page.locator('main.sus-workspace').getAttribute('data-workspace-theme'),'graphite');
      const desktop=await page.evaluate(inspectPaint);
      if(shots.has(board))await page.screenshot({path:path.join(outputDir,board+'-desktop.png')});
      await page.setViewportSize({width:390,height:844});
      await page.waitForTimeout(50);
      const mobile=await page.evaluate(inspectPaint);
      if(shots.has(board))await page.screenshot({path:path.join(outputDir,board+'-mobile.png')});
      const record={board,resolved:new URL(page.url()).searchParams.get('board'),desktop,mobile,errors:[...errors]};results.push(record);
      fs.writeFileSync(path.join(outputDir,'report.json'),JSON.stringify(results,null,2));
      console.log(board,desktop.bright.length+mobile.bright.length?'BRIGHT':'dark',desktop.lowContrast.length+mobile.lowContrast.length?'CONTRAST':'contrast-ok',errors.length?'JS-ERROR':'');
    }await page.close();
  }));
  fs.writeFileSync(path.join(outputDir,'report.json'),JSON.stringify(results,null,2));
  await browser.close();
  assert.ok(results.every(r=>!r.errors.length),'No JavaScript page errors');
  console.log('Completed '+results.length+' routes, desktop and mobile. Paint warnings require review: '+outputDir+'/report.json');
})().catch(e=>{console.error(e);process.exit(1)});
