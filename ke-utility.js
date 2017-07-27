'use babel';
//#######1#########2#########3#########4#########5#########6#########7#########8#########9#########0
const Fs=require('fs');
const Os=require('os');
const Cp=require('child_process');
const Ev=require('events');
const Hp=require('http');
const Qs=require('querystring');
module.export = class keUtility {
  constructer () {
    this.Custom = {}; this.Event = {}; this.INFOJ = {};
    this.REC = []; this.SCREEN = {}; this.CFG = {};
    this.DICT = {};
    this.Mode = ""; this.error = ''; this.Related = '';
  }
//
  version () {
    console.log('1.0-7727');
  }
//
// info 環境情報の取り出し printenv
//      ()==>CFG
  info (group) {
    let me=this, d, o, a, i, k, p, f, t;
//
// mode, config, groupの決定
    let mode;
    if(process.env.RUNMODE){mode=process.env.RUNMODE;}
    else if(me.isExist(process.env.HOME+'/debug.config')){
      mode='debug'; me.CFG.config=process.env.HOME+'/debug.config';
    }
    else if(me.isExist(process.env.HOME+'/master.config')){
      mode='master'; me.CFG.config=process.env.HOME+'/master.config';
    }
    else{mode="standalone";}
    me.CFG.mode=mode;
    if(process.env.RUNCONFIG){me.CFG.config=process.env.RUNCONFIG;}
    group=group||mode;
//
// 省略値設定
    me.CFG.dbdriver='knpostgre'; me.CFG.admin=''; me.CFG.psw=''; me.CFG.service='Gmail';
    me.CFG.level='warn'; me.CFG.notify='no';
//
// 自動設定
    p=me.lastOf(process.argv[1], '/');
    me.CFG.home=process.env.HOME;
    me.CFG.log=process.env.HOME+'/log'+process.argv[1].substr(p)+'.'+me.date('YMD-HIS')+'.log';
    me.CFG.path=process.argv[1]; me.CFG.pid=process.pid; me.CFG.current=process.cwd();
    me.CFG.apli=me.filepart(me.CFG.path);
    me.CFG.groupid=process.getgid(); me.CFG.uid=process.getuid();
    me.CFG.platform=process.platform; me.CFG.user=process.env.USER; me.CFG.home=process.env.HOME;
    me.CFG.directory=me.pullDir(process.argv[1]);
//  ログディレクトリチェック
    me.checkDir(['log']);
    me.infoLog('MODE: '+mode);
    if(mode=='standalone'){return;}
// 設定読み込み
    f=me.CFG.config;
    if(me.isExist(f)){try{
      me.infoLog('config file='+f);
      d=me.getFs(f);
      if(d){o=JSON.parse(d);}
      else{me.infoLog('コンフィグファイルが読めない。file='+f); process.exit(1);}
    }catch(e){
      me.infoLog('コンフィグファイルが読めない。file='+f); process.exit(1);
    }}else{me.infoLog('コンフィグファイルが読めない。file='+f); process.exit(1);}

    a=me.CFG.directory.split("/"); me.CFG.project=a[3];
    let ix; for(ix in o){if(mode==o[ix].mode){
      if(o[ix].group==a[3] || o[ix].group=='all'){
        f=''; t='';
        if(o[ix].valid){a=o[ix].valid.split(':'); f=a[0]; t=a[1];}
        if(!f){f='000101';} if(!t){t='991231';}
        if(me.today('YMD')>=f && me.today('YMD')<=t){
          for(k in o[ix]){me.CFG[k]=o[ix][k];}
        }
      }
    }}
    if(mode=='master'){me.infoLog('CONFIG>>'+JSON.stringify(me.CFG));}
    me.Mode=mode;
  }
//
//
//        ({fn: ファイルパス, [infoj: true/false, stop: true/false]})
  localConf (op) {
    let me=this; op=op||{};
    let fn=op.fn||process.argv[1].replace(/\.js/, '.cfg');
    let infoj=op.infoj||false; let stop=op.stop||false; me.error='';
    let rc;
    try{
      rc=this.getFs(fn); if(infoj){this.INFOJ=JSON.parse(rc);}else{this.CFG=JSON.parse(rc);}
    }catch(e){
      if(stop){me.sevierLog(e);}else{me.error=e; return {};}
    }
    if(rc){return JSON.parse(rc);}else{return {};}
  }
//
//
//
  dict(key, field) {
    let me=this, rc; me.error=''; field=field||'jp';
    if(me.DICT==''){me.DICT=me.getObject(me.CFG.dictionary, true);}
    try{rc=me.DICT[key][field];}catch(e){me.error=e; rc=key;}
    return rc;
  }
//
// argv 起動引数の取り出し
//      (n個目)==>値
  argv(n) {return process.argv[n+2];}
//
// develop テンプレートの展開
//
  develop(fname, dt, ix) {
    let me=this; if(!dt){dt=me.REC;} if(!ix){ix=0;}
    let d=me.getText(fname, true);
    let f={}; f.HEAD=''; f.BODY=''; f.FOOT='';
    let k='BODY', out='';
    let i;
    if(d){
      if(d[0]){
        if(d[0].charCodeAt(0)==65279){d[0]=d[0].substr(1);} // bom除去feff
        if(d[0].charCodeAt(0)==65534){d[0]=d[0].substr(1);} // bom除去fffe
      }
      for(i in d){switch(d[i]){
       case '-HEAD': k='HEAD'; break; case '-BODY': k='BODY'; break; case '-FOOT': k='FOOT'; break;
       default: f[k]+=d[i]+"\n";
      }}
    }else{return false;}

    let url;
    if(f.BODY){
      out=me.parm(f.HEAD, dt[ix]);
      for(i in dt){
        url=dt[i].url||''; if(url==me.INFOJ.url){me.INFOJ.now='now';}else{me.INFOJ.now='';}
        out+=me.parm(f.BODY, dt[i]);
      }
      out+=me.parm(f.FOOT, dt[ix]);
    }else{me.error="#ERROR MEM frame="+fname; return false;}
    return out;
  }
//
// parm パラメータ展開
//      (文字列, {パラメタ})   #{}<-INFOJ, %{}<-REC, ${}, ${}<-SCREEN &{}<- CFG
  parm(ln, dt, ix, i, j, c, sw, out, cc, key) { // develop parameter
    let me=this; sw=0; out=''; key=''; if(!ix){ix=0;}
    if(!ln){return '';}
    for(i=0; i<ln.length; i++){
      c=ln.substr(i, 1); cc=ln.substr(i, 2);
      switch(sw){
       case 0:
        switch(cc){
          case '#{': sw=1; i++; key=''; break; case '%{': sw=2; i++; key=''; break;
          case '${': sw=3; i++; key=''; break; case '&{': sw=4; i++; key=''; break;
          default: if(cc>'%0' && cc<'%9'){sw=9;}else{out+=c;} break;
        } break;
       case 1:
        if(c=='}'){if(me.INFOJ[key]!==undefined){out+=me.INFOJ[key];} sw=0;}
        else{key+=c;} break;
       case 2:
        if(c=='}'){
          if(dt){if(dt[key]!==undefined){out+=dt[key];}}
          else{if(me.REC[ix]!==undefined){out+=me.REC[ix][key];}}
          sw=0;
        }else{
          key+=c;
        } break;
       case 3:
        if(c=='}'){if(me.SCREEN[key]!==undefined){out+=me.SCREEN[key];} sw=0;}else{key+=c;} break;
       case 4:
        if(c=='}'){if(me.CFG[key]!==undefined){out+=me.CFG[key];} sw=0;}else{key+=c;} break;
      }
    }
    return out;
  }
//
// unstring 文字列をスペースデリミタで分解
//         (文字列)=>[結果j配列]
  unstring(x) {
    let win=false, sin=false, ein=false, a=[], j=0;
    a[0]=''; a[1]='';
    let i; for(i=0; i<x.length; i++){
      if(ein){
        a[j]+=x[i]; ein=false;
      }else{
        switch(x[i]){
         case '\\':
          if(sin){ein=true;}else{a[j]+=x[i];}
          break;
         case '"':
          if(sin){sin=false; j++;}else{sin=true; a[j]='';}
          break;
         case ' ':
          if(sin){a[j]+=x[i];}else{if(win){j++; win=false;}} break;
         default:
          if(sin){a[j]+=x[i];}else{if(win){a[j]+=x[i];}else{win=true; a[j]=x[i];}} break;
        }
      }
    }
    return a;
  }
//
  escape(txt) {
   let o='', x; for(x in txt){if(txt[x]=="'"){o+="'";} o=o+txt[x];} return o;
  }
//
//
//
  lastOf(txt, x) {
    let i;
    for(i=txt.length-1; i>-1; i--){if(txt[i]==x){return i;}}
    return -1;
  }
//
  pullDir(txt) {
    let i=this.lastOf(txt, '/'); return txt.substr(0, i+1);
  }
//
  repby(txt, x, y) {
    let out='', i; for(i in txt){if(txt[i]==x){out+=y;}else{out+=txt[i];}} return out;
  }
//
  separate(txt, x) {
    let out=[], i; out[0]=''; out[1]=''; f=true;
    for(i in txt){
      if(f && txt[i]==x){f=false;}else{if(f){out[0]+=txt[i];}else{out[1]+=txt[i];}}
    }
    return out;
  }
//
// modifier 接尾拡張子を取り出し
//          (ファイル名)==>拡張子
  modifier(x) {
    let p=x.lastIndexOf('.'); if(p<0){return '';} p++; return x.substr(p);
  }
//
// filepart ファイル名部分を取り出し
//          (ファイル名)==>拡張子
  filepart(x) {
    let p=x.lastIndexOf('/'); if(p<0){return x;} p++; return x.substr(p);
  }
//
// pathpart パス部分を取り出し
//          (ファイル名)==>拡張子
  pathpart(x) {
    let p=x.lastIndexOf('/'); if(p<0){return '';} return x.substr(0, p+1);
  }
//
// date 日付編集 YMD ymd HIS his W w
//      (編集文字列)==>編集日付
  date(t, time) {
    let d;
    if(time){d=new Date(time);}else{d=new Date();}
    t=t.replace(/Y/, d.getYear()-100); t=t.replace(/y/, d.getYear()+1900);
    t=t.replace(/M/, (d.getMonth()+101+' ').substr(1, 2)); t=t.replace(/m/, d.getMonth()+1);
    t=t.replace(/D/, (d.getDate()+100+' ').substr(1, 2)); t=t.replace(/d/, d.getDate());
    t=t.replace(/H/, (d.getHours()+100+' ').substr(1, 2)); t=t.replace(/h/, d.getHours());
    t=t.replace(/I/, (d.getMinutes()+100+' ').substr(1, 2)); t=t.replace(/i/, d.getMinutes());
    t=t.replace(/S/, (d.getSeconds()+100+' ').substr(1, 2)); t=t.replace(/s/, d.getSeconds());
    t=t.replace(/W/, ['日', '月', '火', '水', '木' ,'金' , '土'][d.getDay()]);
    t=t.replace(/w/, ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]);
    return t;
  }
  today(f) {
    f=f||'Y/M/D'; return this.date(f);
  }
  now(f) {
    f=f||'H:I:S'; return this.date(f);
  }
  addDays(days, from, form) {
    let me=this, d;
    d=from||new Date(); form=form||'YMD'; days=days||0;
    d.setTime(d.getTime()+(days*86400000));
    return me.date(form, d);
  }
//
// isExist ファイル存在確認
//         (ファイル名)==> true|false
  isExist(fn) {
    try{return Fs.existsSync(fn);}catch(e){return false;}
  }
//
// mkdir ディレクトリ作成
//         (ディレクトリ名)==> true|false
  mkdir(dn) {
    try{return Fs.mkdirSync(dn);}catch(e){me.error=e; return false;}
  }
//
// checkDir ディレクトリがなければ作成　HOME以下
//
  checkDir(dirs, current) {
    let me=this, ix, dn; current=current||me.CFG.home+'/';
    for(ix in dirs){dn=current+dirs[ix];if(!me.isExist(dn)){me.mkdir(dn);}}
  }
//
// dir ディレクトリリスト
//     (ディレクトリ, file||dir)==>[リスト]
  dir(path, type) {
    let me=this, out=[]; me.error='';
    try{
      switch(type){
       case 'file':
        Fs.readdirSync(path).forEach((file) => {
          if(Fs.statSync(path+file).isFile()){out.push(file);}
        });
        return out;
       case 'dir':
        Fs.readdirSync(path).forEach((file) => {
          if(!Fs.statSync(path+file).isFile()){out.push(file);}
        });
        return out;
       default:
        return Fs.readdirSync(path);
      }
    }catch(e){me.error=e; return {};}
  }
//
// stat ファイル属性の取得
//      (ファイル名)==>属性オブジェクト
  stat(fn) {
    let out={}, x, k, a;
    if(this.isExist(fn)){
      x=Fs.statSync(fn); a=[]; for(k in x){
        switch(k){
          case 'atime': case 'mtime': case 'ctime':
           out[k]=this.date('YMDHIS', x[k]);
          break;
         default: out[k]=x[k]; break;
        }
      }
      return out;
    }else{return false;}
  }
//
// getObject オブジェクト形式ファイル読み込み(RECインターフェイス)
//           (ファイル名, <リターンフラグ>)==>完了フラグ|オブジェクト
  getObject(fname, ret) {
    let me=this, d, rc={}; me.error='';
    if(me.isExist(fname)){
      d=me.getFs(fname);
      if(d){rc=JSON.parse(d);}
    }else{me.error='file not found f='+fname; return false;}
    if(ret){return rc;}else{me.REC=rc; return me.REC.length;}
   }
//
// getText テキストファイル読み込み
//           (ファイル名, リターンフラグ)==>完了フラグ|オブジェクト[]
  getText(fname, ret) {
    let me=this, d, p=0, i=0, rc, out=[]; me.error='';
    try{
      d=me.getFs(fname);
      if(d){while(p>-1){
        p=d.indexOf("\n");
        if(p<0){out[i]=d;}else{out[i]=d.substr(0, p); d=d.substr(p+1);}
        if(out[i].indexOf("\r")>-1){out[i]=out[i].substr(0, out[i].length-1);} i++;
      }}
      if(ret){return out;}
      else{me.REC=[]; for(i in out){me.REC[i]={}; me.REC[i].data=out[i];} return me.REC.length;}
    }catch(e){me.error=e; return false;}
  }
//
// getjson JSON形式ファイルの読み込み
//        (ファイル名)==>オブジェクト||false
  getJson(fn) {
    let rc;
    try{
      rc=this.getFs(fn); if(rc){return JSON.parse(rc);}else{return false;}
    }catch(e){this.error=e;}
  }
//
// getFs ファイル読み込み
//       (ファイル名)==>バッファ
  getFs(fn) {
    this.error='';
    let d;
    if(this.isExist(fn)){d=Fs.readFileSync(fn).toString(); return d;}
    else{this.error='file not found file='+fn; return false;}
  }
//
// getIp 自IPアドレス
//       ()
  getIp(id, ver) {
    let me=this; ver=ver||'ipv4';
    let a=K.getIPs()[ver];
    let i; for( i in a){
      if(!id){return a[i].address;}
      else{if(id==a[i].name){return a[i].address;}}
    }
    return false;
  }
  getIPs() {
    let o={}; o.ipv4=[]; o.ipv6=[];
    let nif=Os.networkInterfaces();
    let k, j, x;
    for(k in nif){for(j in nif[k]){
      x=nif[k][j];
      if(!x.internal){
        switch(x.family){
          case "IPv4": o.ipv4.push({name: k, address: x.address}); break;
          case "IPv6": o.ipv6.push({name: k, address: x.address}); break;
        }
      }
    }}
    return o;
  }
//
// shell シェルコマンドの実行
//       (コマンド)==>実行結果
  shell(cmd) {
    let me=this, rc;
    promise.resolve().then( () => {
      Cp.exec(cmd, (err, stdout, stderr) => {
        if(!err){me.stdout=stdout; rc=true;}
        else{me.infoEx(err, err.code); rc=false;}
        resolve();
      });
    }).then( () => {
      return rc;
    });
  }
//
  on(ev, proc) {
    this.Custom.ev=new Ev.EventEmitter();
    this.Custom.ev.on(ev, proc);
  }
//
  fire(ev, arg1, arg2, arg3) {
    if(this.Custom[ev]){this.Custom[ev].emit(ev, arg1, arg2, arg3); return true;}
    else{this.error='event not found ev='+ev; return false;}
  }
//
  off(ev) {
    if(this.Custom[ev]){this.Custom[ev].removeListener(ev, () => {delete me.Custom[ev];});}
    else{this.error='event not found ev='+ev; return false;}
    return true;
  }
//
// sleep 時間待ち
//       (ミリセカンド)
  sleep(ms) {
    promise.resolve().then( () => {
      setTimeout(() => {resolve();}, ms);
    }).then( () => {
      return true;
    });
  }
//###
//LOG MANAGEMENT
//###
  isDebug() {
    if(!this.CFG){return true;} if(this.CFG.mode=='debug'){return true;}
    return false;
  }
// debug, info, notice, warn, error, crit, alert, emerg
  sevierLog(msg, e) { // 重大エラー　呼び出し、終了
    let me=this, d={}, l; d.msg=msg;
    if(e){d=me.analyze(e); d.msg=msg;}else{d=me.getPos(msg);} l='sevier';
    this.putlog(l, d);
    me.notify(l, 'システムエラー通知 ['+l+'] ',d);
  }
  errorLog (msg, e) { // 通常エラー処理、ログ記録
    let me=this, d={}, l;
    if(e){d=me.analyze(e); d.msg=msg;}else{d=me.getPos(msg);} l='error';
    this.putlog(l, d);
  }
  noticeLog(msg) {
    let me=this, d=this.getPos(msg), l='notice';
    this.putlog(l, d);
    me.notify(l, 'システム情報 ['+l+'] ', d);
  }
  warnLog(msg) { // 警告メッセージ
    let me=this, d=this.getPos(msg), l='warn';
    this.putlog(l, d);
  }
  infoLog(msg, e) { // エラーかどうかはアプリで判断
    let me=this, d={}, l;
    if(e){d=me.analyze(e); d.msg=msg;}else{d.msg=msg;} l='info';
    this.putlog(l, d);
  }
  debugLog(msg) { // デバッグ用記録
    let me=this, d=this.getPos(msg), l='debug';
    this.putlog(l, d);
  }
  justLog(msg) { // ログのみ
    let me=this, d=this.getPos(msg), l='debug';
    this.putlog(l, d);
  }
//
  putlog(level, lines) {
    let me=this, tbl={debug: 0, info: 1, warn: 2, notice: 3, error: 4, sevier: 5};
    let f=(tbl[me.CFG.level]>tbl[level]);
    let eproc = (err) => {if(err){console.log(err);}};
    let out, k; for(k in lines){
      out=me.date('Y/M/D H:I:S')+' ['+level+'] '+k+': '+lines[k]+'\n';
      if(!me.isDebug()){Fs.appendFile(me.CFG.log, out, eproc(err));}
      console.log(out);
    }
  }
//
  notify(level, subject, data) {
    let me=this, rc; data=data||{};
    if(me.CFG.notify=='yes'){
      data.subject=subject; data.level=level; data.debug=me.isDebug();
      data.program=JSON.stringify(process.argv);
      rc=me.postRequest(me.CFG.communicator, data);
      if(!rc){console.log('NOTIFY ERROR');}
    }
  }
//
// getRequest
//
  getRequest(op, data) {
    let me=this;
    op=op||{}; op.hostname=op.hostname||'localhost'; op.port=op.port||'80';
    op.path=op.path||'/';

    let body;
    promise.resolve().then( () => {
      Hp.get(op, (res) => {
        body=''; res.setEncoding('utf8');
        res.on('data', (chunk) => {body+=chunk;});
        res.on('end', () => {resolve();});
      }).on('error', (e) => {me.error=e.message; resolve();});
    }).then( () => {
      try{
        if(data=="json"){return JSON.parse(body);}
        else{return body;}
      }catch(e){
        me.error=e; return {};
      }
    });
  }
//
//
//
  postRequest(op, data) {
    let me=this;
    op=op||{}; op.hostname=op.hostname||'localhost'; op.port=op.port||'8085';
    op.path=op.path||'/'; op.method='POST';
    op.headers={'Content-Type': 'application/x-www-form-urlencoded'};

    let sd=Qs.stringify(data);
    let body, req;
    promise.resolve ().then ( () => {
      req=Hp.request(op, (res) => {
        body=''; res.setEncoding('utf8');
        res.on('data', (chunk) => {body+=chunk;});
        res.on('end', () => {resolve();});
      }).on('error', (e) => {me.error=e.message; resolve();});
      req.write(sd); req.end();
    }).then ( () => {
      try{return JSON.parse(body);}catch(e){me.error=e; return {};}
    });

  }
//
  getPos(msg) {
    try{throw new Error(msg);}catch(e){return this.analyze(e, 3);}
  }
// analyze エラー分解
  analyze(e, n) {
    n=n||1; let out={}, a, p;
    if(e.stack){
      a=e.stack.split(/[\r\n]+/);
      out.err=a[0];
      p=a[n].indexOf('at '); out.pos=a[n].substr(p+3);
      if(this.Related){out.related=this.Related;}
    }
    return out;
  }
};
