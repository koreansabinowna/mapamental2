import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Utilitários ──────────────────────────────────────────
const G = () => Math.random().toString(36).slice(2, 8)
const PAL = ['#FF6B6B','#FF8E42','#FFCA3A','#6BCB77','#4DD4C1','#45B7D1','#7B7EEE','#E784BF','#F875AA','#60C5FA']
const FONTS = ['Poppins','Georgia','Courier New','Trebuchet MS','Impact']
const BGS = ['#0d0d14','#1a1a2e','#0f2027','#f4f4f0','#1e293b','#2a1b3d']
const TOKEN_KEY = 'mm_token'
const USER_KEY  = 'mm_user'
const IMG_H     = 80  // altura da imagem dentro do nó

function curve(x1,y1,x2,y2) {
  const mx = (x1+x2)/2
  return `M${x1} ${y1} C${mx} ${y1},${mx} ${y2},${x2} ${y2}`
}

// Altura total do nó (com ou sem imagem)
const totalH = (n) => n.img ? IMG_H + n.h : n.h

// Quebra texto em linhas respeitando largura do nó
function computeLines(text, nodeW, fontSize) {
  const charW = fontSize * 0.58
  const maxChars = Math.max(4, Math.floor((nodeW - 24) / charW))
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word
    if (test.length <= maxChars) {
      cur = test
    } else {
      if (cur) lines.push(cur)
      if (word.length > maxChars) {
        let w = word
        while (w.length > maxChars) { lines.push(w.slice(0, maxChars)); w = w.slice(maxChars) }
        cur = w
      } else { cur = word }
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [text]
}

// Calcula altura ideal para o número de linhas
function autoHeight(lines, fontSize) {
  return Math.max(36, lines.length * (fontSize + 10) + 14)
}

// ─── Formas geométricas de fluxograma ─────────────────────
const SHAPE_LIST = [
  { key:'rect',         label:'Processo'       },
  { key:'diamond',      label:'Decisão'        },
  { key:'ellipse',      label:'Operação'       },
  { key:'terminal',     label:'Terminal'       },
  { key:'parallelogram',label:'Input/Output'   },
  { key:'trapezoid',    label:'Op. Manual'     },
  { key:'hexagon',      label:'Preparação'     },
  { key:'document',     label:'Documento'      },
  { key:'cylinder',     label:'Database'       },
  { key:'pentagon',     label:'Conex. Pág.'    },
  { key:'delay',        label:'Atraso'         },
  { key:'stored_data',  label:'Dados Armaz.'   },
  { key:'predefined',   label:'Proc. Pré-def.' },
  { key:'storage',      label:'Armazenamento'  },
  { key:'display',      label:'Display'        },
]

function shapePath(shape, w, h) {
  const r = Math.min(h/2, w/3)
  switch(shape) {
    case 'diamond':      return `M${w/2},0 L${w},${h/2} L${w/2},${h} L0,${h/2} Z`
    case 'terminal':     return `M${r},0 L${w-r},0 A${r},${r} 0 0,1 ${w-r},${h} L${r},${h} A${r},${r} 0 0,1 ${r},0 Z`
    case 'parallelogram':return `M${h*.32},0 L${w},0 L${w-h*.32},${h} L0,${h} Z`
    case 'trapezoid':    return `M${h*.22},0 L${w-h*.22},0 L${w},${h} L0,${h} Z`
    case 'hexagon':      return `M${w*.2},0 L${w*.8},0 L${w},${h/2} L${w*.8},${h} L${w*.2},${h} L0,${h/2} Z`
    case 'document':     { const wh=h*.18; return `M0,0 L${w},0 L${w},${h-wh} Q${w*.75},${h} ${w*.5},${h-wh} Q${w*.25},${h-wh*2} 0,${h-wh} Z` }
    case 'pentagon':     return `M0,0 L${w},0 L${w},${h*.65} L${w/2},${h} L0,${h*.65} Z`
    case 'delay':        { const dr=h/2; return `M0,0 L${w-dr},0 A${dr},${dr} 0 0,1 ${w-dr},${h} L0,${h} Z` }
    case 'stored_data':  return `M${h*.32},0 L${w},0 L${w},${h} L${h*.32},${h} Q0,${h*.75} 0,${h/2} Q0,${h*.25} ${h*.32},0 Z`
    case 'predefined':   return `M0,0 L${w},0 L${w},${h} L0,${h} Z`
    case 'storage':      return `M0,0 L${w},0 L${w*.72},${h} L${w*.28},${h} Z`
    case 'display':      { const dl=h*.35,dr2=w-h*.25; return `M${dl},0 L${dr2},0 Q${w},0 ${w},${h/2} Q${w},${h} ${dr2},${h} L${dl},${h} L0,${h/2} Z` }
    default:             return `M12,0 L${w-12},0 Q${w},0 ${w},12 L${w},${h-12} Q${w},${h} ${w-12},${h} L12,${h} Q0,${h} 0,${h-12} L0,12 Q0,0 12,0 Z`
  }
}

function NodeShape({ shape, w, h, fill, stroke, strokeWidth }) {
  const sw = strokeWidth||1, st = stroke||'rgba(255,255,255,.12)'
  if (shape==='ellipse') return <ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2} fill={fill} stroke={st} strokeWidth={sw}/>
  if (shape==='cylinder') {
    const ry = Math.max(7, h*.15)
    return <g>
      <path d={`M0,${ry} L0,${h-ry} A${w/2},${ry} 0 0,0 ${w},${h-ry} L${w},${ry} A${w/2},${ry} 0 0,0 0,${ry} Z`} fill={fill} stroke={st} strokeWidth={sw}/>
      <ellipse cx={w/2} cy={ry} rx={w/2} ry={ry} fill={fill} stroke={st} strokeWidth={sw}/>
      <path d={`M0,${ry} A${w/2},${ry} 0 0,1 ${w},${ry}`} fill="none" stroke="rgba(0,0,0,.2)" strokeWidth={sw}/>
    </g>
  }
  if (shape==='predefined') return <g>
    <path d={shapePath('predefined',w,h)} fill={fill} stroke={st} strokeWidth={sw}/>
    <line x1={w*.12} y1={0} x2={w*.12} y2={h} stroke={st} strokeWidth={sw}/>
    <line x1={w*.88} y1={0} x2={w*.88} y2={h} stroke={st} strokeWidth={sw}/>
  </g>
  return <path d={shapePath(shape,w,h)} fill={fill} stroke={st} strokeWidth={sw}/>
}

const INIT_MAP = () => ({
  nodes: {
    r: {id:'r',text:'Meu Mapa',x:-75,y:-22,w:150,h:44,bg:'#4DD4C1',fg:'#fff',fs:17,ff:'Poppins',p:null,ch:['a','b'],lk:'',nt:'',img:'',shape:'rect'},
    a: {id:'a',text:'Tópico 1', x:195,y:-82,w:130,h:42,bg:'#FF6B6B',fg:'#fff',fs:14,ff:'Poppins',p:'r',ch:[],lk:'',nt:'',img:'',shape:'rect'},
    b: {id:'b',text:'Tópico 2', x:195,y: 52,w:130,h:42,bg:'#45B7D1',fg:'#fff',fs:14,ff:'Poppins',p:'r',ch:[],lk:'',nt:'',img:'',shape:'rect'},
  },
  xs: [],
})

// ─── API ──────────────────────────────────────────────────
const api = {
  tok: () => localStorage.getItem(TOKEN_KEY),
  hdr: () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${api.tok()}` }),
  async req(method, path, body) {
    const r = await fetch(`/api${path}`, {
      method,
      headers: api.hdr(),
      body: body ? JSON.stringify(body) : undefined
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Erro desconhecido')
    return d
  },
  login:    (email,pw)       => api.req('POST','/auth/login',   {email,password:pw}),
  register: (name,email,pw)  => api.req('POST','/auth/register',{name,email,password:pw}),
  getMaps:  ()               => api.req('GET', '/maps'),
  getMap:   (id)             => api.req('GET', `/maps/${id}`),
  createMap:(title,data)     => api.req('POST','/maps',         {title,...data}),
  updateMap:(id,data)        => api.req('PUT', `/maps/${id}`,   data),
  deleteMap:(id)             => api.req('DELETE',`/maps/${id}`),
  share:    (id,action)      => api.req('POST',`/maps/${id}/share`,{action}),
  uploadImg: (mapId, file)  => {
    const fd = new FormData()
    fd.append('image', file)
    return fetch(`/api/maps/${mapId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${api.tok()}` },
      body: fd
    }).then(r => r.json())
  },
}

// ─── Estilos compartilhados ────────────────────────────────
const S = {
  input: {
    display:'block',width:'100%',padding:'10px 14px',marginBottom:10,
    background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',
    color:'#fff',borderRadius:10,fontSize:13,fontFamily:'Poppins,sans-serif',
    outline:'none',boxSizing:'border-box'
  },
  btn: (accent) => ({
    padding:'10px 20px',background:accent||'rgba(255,255,255,.08)',
    color:accent?'#000':'rgba(255,255,255,.85)',
    border:`1px solid ${accent||'rgba(255,255,255,.12)'}`,
    borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:600,
    fontFamily:'Poppins,sans-serif',whiteSpace:'nowrap'
  }),
  toolBtn: (active) => ({
    display:'flex',alignItems:'center',gap:4,padding:'5px 10px',
    background:active?'rgba(77,212,193,.2)':'rgba(255,255,255,.07)',
    color:active?'#4DD4C1':'rgba(255,255,255,.75)',
    border:`1px solid ${active?'rgba(77,212,193,.4)':'rgba(255,255,255,.1)'}`,
    borderRadius:8,cursor:'pointer',fontSize:11.5,fontFamily:'Poppins,sans-serif',
    whiteSpace:'nowrap'
  }),
  panelInput: {
    width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',
    color:'#fff',borderRadius:8,padding:'5px 9px',fontSize:12,
    fontFamily:'Poppins,sans-serif',marginBottom:8,boxSizing:'border-box',outline:'none'
  },
  select: {
    width:'100%',background:'rgba(15,15,28,.95)',color:'#fff',
    border:'1px solid rgba(255,255,255,.1)',borderRadius:8,
    padding:'5px 9px',fontSize:12,fontFamily:'Poppins,sans-serif',
    marginBottom:8,outline:'none'
  },
  panelBtn: (danger) => ({
    padding:'7px 6px',background:danger?'rgba(255,80,80,.1)':'rgba(255,255,255,.06)',
    color:danger?'#ff9090':'rgba(255,255,255,.8)',
    border:`1px solid ${danger?'rgba(255,80,80,.25)':'rgba(255,255,255,.1)'}`,
    borderRadius:8,cursor:'pointer',fontSize:12,fontFamily:'Poppins,sans-serif'
  }),
  divider: { width:1, height:18, background:'rgba(255,255,255,.1)', margin:'0 3px', flexShrink:0 },
}

// ════════════════════════════════════════════════════════
//  AUTH SCREEN
// ════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [tab, setTab]         = useState('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      const d = tab === 'login'
        ? await api.login(email, password)
        : await api.register(name, email, password)
      localStorage.setItem(TOKEN_KEY, d.token)
      localStorage.setItem(USER_KEY, JSON.stringify(d.user))
      onLogin(d.token, d.user)
    } catch(e) { setError(e.message) }
    finally    { setLoading(false)  }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0d0d14',fontFamily:'Poppins,sans-serif'}}>
      <div style={{background:'#111120',border:'1px solid rgba(255,255,255,.08)',borderRadius:18,padding:'38px 42px',width:390,boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
        <div style={{textAlign:'center',marginBottom:30}}>
          <div style={{fontSize:40,marginBottom:10}}>🧠</div>
          <h1 style={{color:'#4DD4C1',fontSize:24,fontWeight:700,margin:0,letterSpacing:1}}>MindMap</h1>
          <p style={{color:'rgba(255,255,255,.35)',fontSize:13,margin:'8px 0 0'}}>Crie mapas mentais incríveis</p>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',background:'rgba(255,255,255,.05)',borderRadius:10,padding:3,marginBottom:24,gap:2}}>
          {['login','register'].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setError('')}}
              style={{flex:1,padding:'9px',border:'none',borderRadius:8,cursor:'pointer',
                fontSize:13,fontWeight:tab===t?700:400,transition:'all .2s',fontFamily:'inherit',
                background:tab===t?'#4DD4C1':'transparent',
                color:tab===t?'#000':'rgba(255,255,255,.45)'}}>
              {t==='login'?'Entrar':'Cadastrar'}
            </button>
          ))}
        </div>

        {tab==='register' && (
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="Seu nome" style={S.input}
            onKeyDown={e=>e.key==='Enter'&&submit()}/>
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="E-mail" type="email" style={S.input}
          onKeyDown={e=>e.key==='Enter'&&submit()}/>
        <input value={password} onChange={e=>setPass(e.target.value)}
          placeholder="Senha" type="password" style={{...S.input,marginBottom:16}}
          onKeyDown={e=>e.key==='Enter'&&submit()}/>

        {error && <div style={{color:'#ff7b7b',fontSize:12,marginBottom:12,textAlign:'center',background:'rgba(255,80,80,.1)',borderRadius:8,padding:'8px'}}>{error}</div>}

        <button onClick={submit} disabled={loading}
          style={{...S.btn('#4DD4C1'),width:'100%',padding:'12px',fontSize:14,opacity:loading?.65:1}}>
          {loading ? 'Aguarde...' : tab==='login' ? 'Entrar' : 'Criar conta'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  MAP LIST
// ════════════════════════════════════════════════════════
function MapListScreen({ user, onOpen, onLogout }) {
  const [maps, setMaps]       = useState([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNew]    = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.getMaps().then(setMaps).catch(console.error).finally(()=>setLoading(false))
  }, [])

  const create = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const init = INIT_MAP()
      const map  = await api.createMap(newTitle.trim(), {
        bg_color: '#0d0d14',
        data: { nodes: init.nodes, xs: [] }
      })
      onOpen(map.id, newTitle.trim())
    } catch(e) { alert(e.message) }
    finally    { setCreating(false) }
  }

  const del = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Excluir este mapa? Essa ação não pode ser desfeita.')) return
    try { await api.deleteMap(id); setMaps(m=>m.filter(x=>x.id!==id)) }
    catch(e) { alert(e.message) }
  }

  return (
    <div style={{minHeight:'100vh',background:'#0d0d14',fontFamily:'Poppins,sans-serif',color:'#fff'}}>
      {/* Header */}
      <div style={{padding:'14px 28px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:12,background:'rgba(0,0,0,.35)',backdropFilter:'blur(12px)'}}>
        <span style={{fontSize:22}}>🧠</span>
        <span style={{fontWeight:700,fontSize:16,color:'#4DD4C1'}}>MindMap</span>
        <div style={{flex:1}}/>
        <span style={{color:'rgba(255,255,255,.4)',fontSize:12}}>Olá, {user?.name || 'usuário'}</span>
        <button onClick={onLogout} style={{...S.btn(),background:'rgba(255,80,80,.12)',color:'#ff9090',border:'1px solid rgba(255,80,80,.2)',padding:'7px 14px',fontSize:12}}>Sair</button>
      </div>

      {/* Content */}
      <div style={{maxWidth:860,margin:'0 auto',padding:'36px 22px'}}>
        <h2 style={{fontWeight:600,fontSize:20,marginBottom:22,color:'rgba(255,255,255,.9)'}}>Meus Mapas</h2>

        {/* Create bar */}
        <div style={{display:'flex',gap:8,marginBottom:32}}>
          <input value={newTitle} onChange={e=>setNew(e.target.value)}
            placeholder="Nome do novo mapa..." style={{...S.input,flex:1,marginBottom:0}}
            onKeyDown={e=>e.key==='Enter'&&create()}/>
          <button onClick={create} disabled={creating||!newTitle.trim()}
            style={{...S.btn('#4DD4C1'),opacity:creating||!newTitle.trim()?.55:1,flexShrink:0}}>
            {creating?'Criando...':'+ Criar'}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{textAlign:'center',color:'rgba(255,255,255,.25)',padding:60,fontSize:14}}>Carregando seus mapas...</div>
        ) : maps.length === 0 ? (
          <div style={{textAlign:'center',color:'rgba(255,255,255,.25)',padding:70}}>
            <div style={{fontSize:54,marginBottom:14}}>🗺️</div>
            <p style={{fontSize:14}}>Nenhum mapa ainda. Crie o primeiro acima!</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:14}}>
            {maps.map(m=>(
              <div key={m.id} onClick={()=>onOpen(m.id,m.title)}
                style={{background:'#111120',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,
                  padding:'20px 18px',cursor:'pointer',transition:'all .2s',position:'relative'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(77,212,193,.5)';e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.transform=''}}>
                <div style={{fontSize:30,marginBottom:10}}>🧠</div>
                <div style={{fontWeight:600,fontSize:14,marginBottom:5,color:'rgba(255,255,255,.9)'}}>{m.title}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>
                  {new Date(m.updated_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}
                </div>
                {m.is_public && <div style={{position:'absolute',top:12,left:14,fontSize:10,background:'rgba(77,212,193,.15)',color:'#4DD4C1',borderRadius:5,padding:'2px 7px',border:'1px solid rgba(77,212,193,.25)'}}>público</div>}
                <button onClick={e=>del(m.id,e)}
                  style={{position:'absolute',top:10,right:10,background:'rgba(255,80,80,.1)',border:'none',color:'#ff9090',borderRadius:7,padding:'4px 9px',cursor:'pointer',fontSize:13,lineHeight:1}}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  MAP EDITOR
// ════════════════════════════════════════════════════════
function MapEditor({ mapId, mapTitle, onBack }) {
  const [nd, setNd]       = useState(null)
  const [xs, setXs]       = useState([])
  const [bg, setBg]       = useState('#0d0d14')
  const [vp, setVp]       = useState({x:500,y:320,s:1})
  const [sel, setSel]     = useState(null)
  const [edit, setEdit]   = useState(null)
  const [ev, setEv]       = useState('')
  const [ctx, setCtx]     = useState(null)
  const [tool, setTool]   = useState('sel')
  const [cf, setCf]       = useState(null)
  const [hist, setHist]   = useState([])
  const [fut, setFut]     = useState([])
  const [drag, setDrag]   = useState(null)
  const [pan, setPan]     = useState(null)
  const [resize, setResize] = useState(null) // {id, dir, sx, sy, ow, oh}
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(true)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [defaultShape, setDefaultShape] = useState('rect')
  const [pendingShape, setPendingShape] = useState(null)

  const svgRef    = useRef(null)
  const editRef   = useRef(null)
  const saveTimer = useRef(null)
  const titleRef  = useRef(mapTitle)
  const imgInputRef = useRef(null)

  // ── Carregar mapa ────────────────────────────────────
  useEffect(() => {
    api.getMap(mapId)
      .then(map => {
        const d = typeof map.data === 'string' ? JSON.parse(map.data) : map.data
        setNd(d.nodes || {})
        setXs(d.xs || [])
        setBg(map.bg_color || '#0d0d14')
        setLoading(false)
      })
      .catch(() => { alert('Erro ao carregar mapa'); onBack() })
  }, [mapId])

  // ── Auto-save (debounce 1.5s) ────────────────────────
  useEffect(() => {
    if (!nd || loading) return
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await api.updateMap(mapId, {
          title: titleRef.current,
          bg_color: bg,
          data: { nodes: nd, xs }
        })
        setSaved(true)
      } catch(e) { console.error('Auto-save:', e) }
      finally { setSaving(false) }
    }, 1500)
    return () => clearTimeout(saveTimer.current)
  }, [nd, xs, bg])

  // ── Histórico ─────────────────────────────────────────
  const snap = useCallback((n=nd, x=xs) => {
    setHist(h=>[...h.slice(-30), {n:JSON.parse(JSON.stringify(n)), x:JSON.parse(JSON.stringify(x))}])
    setFut([])
  }, [nd, xs])

  const undo = useCallback(() => {
    if (!hist.length) return
    const prev = hist[hist.length-1]
    setFut(f=>[{n:JSON.parse(JSON.stringify(nd)), x:JSON.parse(JSON.stringify(xs))}, ...f.slice(0,30)])
    setNd(prev.n); setXs(prev.x); setHist(h=>h.slice(0,-1))
  }, [hist, nd, xs])

  const redo = useCallback(() => {
    if (!fut.length) return
    const nxt = fut[0]
    setHist(h=>[...h, {n:JSON.parse(JSON.stringify(nd)), x:JSON.parse(JSON.stringify(xs))}])
    setNd(nxt.n); setXs(nxt.x); setFut(f=>f.slice(1))
  }, [fut, nd, xs])

  const upd = (id, props) => setNd(n=>({...n, [id]:{...n[id],...props}}))

  // ── Operações em nós ──────────────────────────────────
  const addChild = useCallback((pid) => {
    const p = nd[pid]; if (!p) return
    const id = G(), i = p.ch.length
    snap()
    setNd(n=>({
      ...n,
      [id]: {id,text:'Novo nó',x:p.x+p.w+90,y:p.y+(i-(i>>1))*74,w:120,h:40,
              bg:PAL[i%PAL.length],fg:'#fff',fs:14,ff:'Poppins',p:pid,ch:[],lk:'',nt:'',img:'',shape:defaultShape},
      [pid]: {...n[pid], ch:[...n[pid].ch, id]}
    }))
    setSel(id); setEdit(id); setEv('Novo nó')
  }, [nd, snap])

  const addSib = useCallback((id) => addChild(nd[id]?.p || id), [nd, addChild])

  const addBinary = useCallback((pid) => {
    const p = nd[pid]; if (!p) return
    const simId = G(), naoId = G()
    const baseX = p.x + p.w + 90
    snap()
    setNd(n=>({
      ...n,
      [simId]: {id:simId,text:'Sim',  x:baseX,y:p.y-60,w:100,h:40,bg:'#6BCB77',fg:'#fff',fs:14,ff:'Poppins',p:pid,ch:[],lk:'',nt:'',img:'',shape:defaultShape},
      [naoId]: {id:naoId,text:'Não',  x:baseX,y:p.y+60,w:100,h:40,bg:'#FF6B6B',fg:'#fff',fs:14,ff:'Poppins',p:pid,ch:[],lk:'',nt:'',img:'',shape:defaultShape},
      [pid]:   {...n[pid], ch:[...n[pid].ch, simId, naoId]}
    }))
    setSel(simId)
  }, [nd, snap, defaultShape])

  const del = useCallback((id) => {
    if (id === 'r') return
    const kill = new Set()
    const col  = i => { kill.add(i); (nd[i]?.ch||[]).forEach(col) }
    col(id); snap()
    setNd(n => {
      const nn = {...n}
      kill.forEach(k => delete nn[k])
      Object.values(nn).forEach(node => {
        if (node.ch) node.ch = node.ch.filter(c => !kill.has(c))
      })
      return nn
    })
    setXs(x => x.filter(e => !kill.has(e.from) && !kill.has(e.to)))
    setSel(null)
  }, [nd, xs, snap])

  const finEdit = useCallback(() => {
    if (!edit) return
    snap()
    const newText = ev.trim() || nd[edit]?.text || '?'
    const n = nd[edit]
    const lines = computeLines(newText, n.w, n.fs)
    const newH = autoHeight(lines, n.fs)
    upd(edit, {text: newText, h: newH})
    setEdit(null)
  }, [edit, ev, nd, snap])

  useEffect(() => {
    if (edit && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [edit])

  // ── Eventos de mouse ──────────────────────────────────
  const onSvgDown = (e) => {
    if (e.button !== 0) return
    if (edit) { finEdit(); return }
    setSel(null); setCtx(null)
    setPan({sx:e.clientX, sy:e.clientY, vx:vp.x, vy:vp.y})
  }

  const onNdDown = (e, id) => {
    e.stopPropagation()
    if (e.button === 2) return
    setCtx(null)
    if (edit && edit !== id) finEdit()
    if (tool === 'con') {
      if (!cf)        { setCf(id) }
      else if(cf!==id){ snap(); setXs(x=>[...x,{id:G(),from:cf,to:id}]); setCf(null); setTool('sel') }
      return
    }
    setSel(id)
    const n = nd[id]
    setDrag({id, ox:n.x, oy:n.y, sx:e.clientX, sy:e.clientY})
  }

  const onMove = (e) => {
    if (resize) {
      const dx=(e.clientX-resize.sx)/vp.s, dy=(e.clientY-resize.sy)/vp.s
      const updates = {}
      if (resize.dir==='w') {
        // Left handle: increase width to left, move x
        const newW = Math.max(70, Math.round(resize.ow - dx))
        updates.w = newW
        updates.x = resize.ox + (resize.ow - newW)
      } else {
        if (resize.dir.includes('e')) updates.w = Math.max(70, Math.round(resize.ow + dx))
        if (resize.dir.includes('s')) updates.h = Math.max(30, Math.round(resize.oh + dy))
      }
      upd(resize.id, updates)
    } else if (drag) {
      const dx=(e.clientX-drag.sx)/vp.s, dy=(e.clientY-drag.sy)/vp.s
      upd(drag.id, {x:drag.ox+dx, y:drag.oy+dy})
    } else if (pan) {
      setVp(v=>({...v, x:pan.vx+e.clientX-pan.sx, y:pan.vy+e.clientY-pan.sy}))
    }
  }

  const onUp = () => {
    if (resize) { snap(); setResize(null) }
    if (drag)   { snap(); setDrag(null) }
    if (pan)    setPan(null)
  }

  const onWheel = (e) => {
    e.preventDefault()
    const f  = e.deltaY > 0 ? .88 : 1.14
    const r  = svgRef.current.getBoundingClientRect()
    const mx = e.clientX-r.left, my = e.clientY-r.top
    setVp(v => {
      const ns = Math.max(.15, Math.min(4, v.s*f))
      return {x:mx-(mx-v.x)*ns/v.s, y:my-(my-v.y)*ns/v.s, s:ns}
    })
  }

  const onDbl = (e, id) => {
    e.stopPropagation()
    setSel(id); setEdit(id); setEv(nd[id].text)
  }

  // ── Teclado ───────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      const tag = document.activeElement?.tagName
      if (tag==='INPUT'||tag==='TEXTAREA') return
      if ((e.ctrlKey||e.metaKey)&&e.key==='z') { e.preventDefault(); undo() }
      if ((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.shiftKey&&e.key==='Z'))) { e.preventDefault(); redo() }
      if (e.key==='Tab'   && sel && !edit) { e.preventDefault(); addChild(sel) }
      if (e.key==='Enter' && sel && !edit) { e.preventDefault(); addSib(sel)   }
      if ((e.key==='Delete'||e.key==='Backspace') && sel && !edit) del(sel)
      if (e.key==='Escape') {
        if (previewImg) { setPreviewImg(null); return }
        setEdit(null); setCtx(null); setCf(null); setTool('sel')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sel, edit, undo, redo, addChild, addSib, del, previewImg])

  // ── Exportar JPG ──────────────────────────────────────
  const exportJPG = () => {
    const svg = svgRef.current
    const w=svg.clientWidth, h=svg.clientHeight
    const data = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width=w*2; canvas.height=h*2
    const c2 = canvas.getContext('2d')
    c2.scale(2,2); c2.fillStyle=bg; c2.fillRect(0,0,w,h)
    const img = new Image()
    const blob= new Blob([data],{type:'image/svg+xml'})
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      c2.drawImage(img,0,0); URL.revokeObjectURL(url)
      const a=document.createElement('a')
      a.download=`${mapTitle}.jpg`
      a.href=canvas.toDataURL('image/jpeg',.92)
      a.click()
    }
    img.src = url
  }

  // ── Compartilhar ──────────────────────────────────────
  const share = async () => {
    try {
      const r = await api.share(mapId,'enable')
      setShareUrl(r.url)
      navigator.clipboard?.writeText(r.url).catch(()=>{})
    } catch(e) { alert(e.message) }
  }

  // ── Upload de imagem ─────────────────────────────────
  const uploadImage = async (file) => {
    if (!file || !sel) return
    setUploading(true)
    try {
      const r = await api.uploadImg(mapId, file)
      snap()
      upd(sel, { img: r.url })
    } catch(e) { alert('Erro ao fazer upload: ' + e.message) }
    finally    { setUploading(false) }
  }

  if (loading || !nd) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'#0d0d14',color:'rgba(255,255,255,.3)',fontFamily:'Poppins,sans-serif',fontSize:14}}>
      Carregando mapa...
    </div>
  )

  // ── Renderizar arestas ────────────────────────────────
  const edges = []
  Object.values(nd).forEach(n => {
    if (!n.p || !nd[n.p]) return
    const p=nd[n.p], toR=n.x>=p.x
    const ph = totalH(p), nh = totalH(n)
    edges.push(<path key={`e${n.id}`}
      d={curve(toR?p.x+p.w:p.x, p.y+ph/2, toR?n.x:n.x+n.w, n.y+nh/2)}
      stroke={n.bg} strokeWidth="2.5" fill="none" strokeOpacity=".75"
      style={{pointerEvents:'none'}}
    />)
  })
  xs.forEach(x => {
    const a=nd[x.from], b=nd[x.to]; if(!a||!b) return
    edges.push(<path key={`x${x.id}`}
      d={curve(a.x+a.w/2,a.y+totalH(a)/2,b.x+b.w/2,b.y+totalH(b)/2)}
      stroke="#F5C16C" strokeWidth="2" strokeDasharray="7 3" fill="none"
      style={{cursor:'pointer'}}
      onClick={()=>{ snap(); setXs(cur=>cur.filter(e=>e.id!==x.id)) }}
    />)
  })

  const sn = sel ? nd[sel] : null

  // ── Renderiza texto com quebra de linha automática ────
  const renderText = (n, imgOffset) => {
    const lines = computeLines(n.text, n.w, n.fs)
    const lineH  = n.fs + 10
    const totalTxtH = lines.length * lineH
    const baseY = imgOffset + (n.h - totalTxtH) / 2 + n.fs * 0.8
    return (
      <text x={n.w/2} y={baseY} textAnchor="middle"
        fill={n.fg} fontSize={n.fs} fontFamily={n.ff} fontWeight="600"
        style={{pointerEvents:'none',userSelect:'none'}}>
        {lines.map((line, i) => (
          <tspan key={i} x={n.w/2} dy={i===0 ? 0 : lineH}>{line}</tspan>
        ))}
      </text>
    )
  }

  // ── Alças de redimensionamento ────────────────────────
  const renderHandles = (n) => {
    const th = totalH(n)
    const hs = 10  // handle size
    const hh = 6   // half
    return (
      <g style={{pointerEvents:'all'}}>
        {/* Direita */}
        <rect x={n.w-hh} y={th/2-hs} width={hs+2} height={hs*2} rx={3}
          fill="white" stroke="#4DD4C1" strokeWidth={1.5} style={{cursor:'ew-resize'}}
          onMouseDown={e=>{e.stopPropagation();setResize({id:n.id,dir:'e',sx:e.clientX,sy:e.clientY,ow:n.w,oh:n.h})}}/>
        {/* Baixo */}
        <rect x={n.w/2-hs} y={th-hh} width={hs*2} height={hs+2} rx={3}
          fill="white" stroke="#4DD4C1" strokeWidth={1.5} style={{cursor:'ns-resize'}}
          onMouseDown={e=>{e.stopPropagation();setResize({id:n.id,dir:'s',sx:e.clientX,sy:e.clientY,ow:n.w,oh:n.h})}}/>
        {/* Canto inferior direito */}
        <rect x={n.w-hh} y={th-hh} width={hs+4} height={hs+4} rx={3}
          fill="#4DD4C1" stroke="white" strokeWidth={1.5} style={{cursor:'nwse-resize'}}
          onMouseDown={e=>{e.stopPropagation();setResize({id:n.id,dir:'se',sx:e.clientX,sy:e.clientY,ow:n.w,oh:n.h})}}/>
        {/* Esquerda */}
        <rect x={-hh} y={th/2-hs} width={hs+2} height={hs*2} rx={3}
          fill="white" stroke="#4DD4C1" strokeWidth={1.5} style={{cursor:'ew-resize'}}
          onMouseDown={e=>{e.stopPropagation();setResize({id:n.id,dir:'w',sx:e.clientX,sy:e.clientY,ow:n.w,oh:n.h,ox:n.x})}}/>
      </g>
    )
  }

  return (
    <div style={{width:'100vw',height:'100vh',display:'flex',flexDirection:'column',
      background:bg,fontFamily:'Poppins,sans-serif',overflow:'hidden',userSelect:'none'}}>

      {/* ── Barra de ferramentas ─────────────────────── */}
      <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
        background:'rgba(0,0,0,.65)',backdropFilter:'blur(14px)',
        borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0,flexWrap:'wrap'}}>

        <button onClick={onBack} style={{...S.toolBtn(false),marginRight:4}}>← Voltar</button>
        <span style={{color:'rgba(255,255,255,.7)',fontSize:13,fontWeight:600,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{mapTitle}</span>
        <span style={{fontSize:10,color:saved?'#4DD4C1':'rgba(255,255,255,.25)',marginLeft:2,minWidth:70}}>
          {saving?'💾 Salvando…':saved?'✓ Salvo':''}
        </span>

        <span style={S.divider}/>
        <button style={S.toolBtn(false)} onClick={()=>setVp(v=>({...v,s:Math.min(4,v.s*1.25)}))} title="Ampliar (Scroll)">🔍+</button>
        <button style={S.toolBtn(false)} onClick={()=>setVp(v=>({...v,s:Math.max(.15,v.s*.8)}))} title="Reduzir (Scroll)">🔍−</button>
        <button style={S.toolBtn(false)} onClick={()=>setVp({x:500,y:320,s:1})} title="Centralizar">⊹ Centralizar</button>
        <span style={{fontSize:11,color:'rgba(255,255,255,.3)',minWidth:36}}>{Math.round(vp.s*100)}%</span>

        <span style={S.divider}/>
        <button style={S.toolBtn(tool==='con')} onClick={()=>{setTool(t=>t==='con'?'sel':'con');setCf(null)}} title="Conectar dois nós">🔗 Conectar</button>

        <span style={S.divider}/>
        <button style={{...S.toolBtn(false),opacity:hist.length?.9:.35}} onClick={undo} disabled={!hist.length} title="Desfazer (Ctrl+Z)">↩ Desfazer</button>
        <button style={{...S.toolBtn(false),opacity:fut.length?.9:.35}}  onClick={redo} disabled={!fut.length}  title="Refazer (Ctrl+Y)">↪ Refazer</button>

        <span style={S.divider}/>
        <span style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Fundo:</span>
        {BGS.map(c=>(
          <div key={c} onClick={()=>setBg(c)} style={{width:16,height:16,borderRadius:'50%',background:c,cursor:'pointer',
            border:`2px solid ${bg===c?'#fff':'transparent'}`,flexShrink:0,transition:'transform .15s'}}
            onMouseEnter={e=>e.target.style.transform='scale(1.3)'}
            onMouseLeave={e=>e.target.style.transform=''}/>
        ))}
        <input type="color" value={bg} onChange={e=>setBg(e.target.value)}
          style={{width:16,height:16,border:'none',borderRadius:'50%',cursor:'pointer',padding:0,flexShrink:0}} title="Cor personalizada"/>

        <span style={S.divider}/>
        <button style={S.toolBtn(false)} onClick={exportJPG} title="Exportar como JPG">💾 Exportar JPG</button>
        <button style={S.toolBtn(!!shareUrl)} onClick={share} title="Gerar link de compartilhamento">🔗 Compartilhar</button>

        {shareUrl && (
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(77,212,193,.1)',
            border:'1px solid rgba(77,212,193,.3)',borderRadius:8,padding:'3px 10px',maxWidth:260}}>
            <span style={{fontSize:10,color:'#4DD4C1',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{shareUrl}</span>
            <button onClick={()=>navigator.clipboard.writeText(shareUrl)} style={{...S.toolBtn(false),padding:'2px 7px',fontSize:10}}>Copiar</button>
          </div>
        )}

        <div style={{flex:1}}/>
        <span style={{fontSize:9.5,color:'rgba(255,255,255,.18)'}}>Tab=filho · Enter=irmão · Del=excluir · Scroll=zoom</span>
      </div>

      {/* ── Canvas SVG ───────────────────────────────── */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <svg ref={svgRef} width="100%" height="100%"
          style={{display:'block',cursor:drag?'grabbing':tool==='con'?'crosshair':pan?'grabbing':'grab'}}
          onMouseDown={onSvgDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onWheel={onWheel} onContextMenu={e=>e.preventDefault()}
        >
          <defs>
            <pattern id="gdots" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r=".65" fill="rgba(128,128,128,.1)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gdots)"/>
          <g transform={`translate(${vp.x},${vp.y}) scale(${vp.s})`}>
            {edges}
            {Object.values(nd).map(n=>{
              const th = totalH(n)
              return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}
                onMouseDown={e=>onNdDown(e,n.id)}
                onDoubleClick={e=>onDbl(e,n.id)}
                onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtx({x:e.clientX,y:e.clientY,id:n.id});setSel(n.id)}}
                style={{cursor:tool==='con'?'crosshair':'move'}}>
                <defs>
                  <clipPath id={`cp${n.id}`}>
                    <rect rx="11" width={n.w} height={th}/>
                  </clipPath>
                </defs>
                {/* Sombra */}
                <g transform="translate(3,5)" style={{pointerEvents:'none',opacity:.4}}>
                  <NodeShape shape={n.shape||'rect'} w={n.w} h={th} fill="rgba(0,0,0,.6)" stroke="none" strokeWidth={0}/>
                </g>
                {/* Fundo do nó */}
                <NodeShape shape={n.shape||'rect'} w={n.w} h={th} fill={n.bg}
                  stroke={sel===n.id?'rgba(255,255,255,.9)':'rgba(255,255,255,.15)'}
                  strokeWidth={sel===n.id?2.5:1}/>
                {/* Imagem (se houver) */}
                {n.img && <>
                  <image href={n.img} x="0" y="0" width={n.w} height={IMG_H}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#cp${n.id})`}
                    style={{pointerEvents:'all', cursor:'zoom-in'}}
                    onClick={e=>{e.stopPropagation(); setPreviewImg(n.img)}}/>
                  <line x1="0" y1={IMG_H} x2={n.w} y2={IMG_H}
                    stroke="rgba(0,0,0,.25)" strokeWidth="1" style={{pointerEvents:'none'}}/>
                </>}
                {/* Texto ou input de edição */}
                {edit===n.id
                  ? <foreignObject x="7" y={n.img?IMG_H+4:5} width={n.w-14} height={n.h-10}>
                      <input ref={editRef} xmlns="http://www.w3.org/1999/xhtml"
                        style={{width:'100%',height:'100%',border:'none',outline:'none',
                          background:'transparent',color:n.fg,fontSize:n.fs,
                          fontFamily:n.ff,fontWeight:600,textAlign:'center',padding:0}}
                        value={ev}
                        onChange={e=>setEv(e.target.value)}
                        onBlur={finEdit}
                        onKeyDown={e=>{
                          if(e.key==='Enter'){e.preventDefault();finEdit()}
                          if(e.key==='Escape') setEdit(null)
                          e.stopPropagation()
                        }}
                        onClick={e=>e.stopPropagation()}
                      />
                    </foreignObject>
                  : renderText(n, n.img ? IMG_H : 0)
                }
                {/* Indicadores */}
                {n.lk && <text x={n.w-7} y="11" fontSize="10" style={{pointerEvents:'none'}}>🔗</text>}
                {n.nt && <text x={n.lk?n.w-19:n.w-7} y="11" fontSize="10" style={{pointerEvents:'none'}}>💬</text>}
                {/* Alças de redimensionamento (apenas no nó selecionado) */}
                {sel===n.id && renderHandles(n)}
              </g>
            )})}
            {/* Animação de origem de conexão */}
            {cf && nd[cf] && (
              <circle cx={nd[cf].x+nd[cf].w/2} cy={nd[cf].y+totalH(nd[cf])/2} r="8" fill="none" stroke="#F5C16C" strokeWidth="2">
                <animate attributeName="r" values="8;22;8" dur=".8s" repeatCount="indefinite"/>
                <animate attributeName="stroke-opacity" values="1;0;1" dur=".8s" repeatCount="indefinite"/>
              </circle>
            )}
          </g>
        </svg>

        {/* ── Painel de propriedades ────────────────── */}
        {sn && (
          <div style={{position:'absolute',right:12,top:12,width:215,
            maxHeight:'calc(100% - 24px)',overflowY:'auto',
            background:'rgba(8,8,18,.96)',backdropFilter:'blur(18px)',
            border:'1px solid rgba(255,255,255,.1)',borderRadius:14,padding:14,color:'#fff'}}>

            <div style={{fontWeight:600,fontSize:13,color:'#4DD4C1',marginBottom:10,
              paddingBottom:8,borderBottom:'1px solid rgba(255,255,255,.07)'}}>
              ✏️ {sn.text.length>16?sn.text.slice(0,15)+'…':sn.text}
            </div>

            <PL>Texto</PL>
            <input style={S.panelInput} value={sn.text} onChange={e=>upd(sel,{text:e.target.value})}/>

            <PL>Tamanho: {sn.fs}px</PL>
            <input type="range" min="10" max="34" value={sn.fs}
              onChange={e=>{
                const fs=+e.target.value
                const lines=computeLines(sn.text,sn.w,fs)
                upd(sel,{fs, h:autoHeight(lines,fs)})
              }}
              style={{width:'100%',accentColor:'#4DD4C1',marginBottom:8}}/>

            <PL>Fonte</PL>
            <select value={sn.ff} onChange={e=>upd(sel,{ff:e.target.value})} style={S.select}>
              {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
            </select>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:0}}>
              <div>
                <PL>Largura: {sn.w}px</PL>
                <input type="range" min="70" max="400" value={sn.w}
                  onChange={e=>{
                    const w=+e.target.value
                    const lines=computeLines(sn.text,w,sn.fs)
                    upd(sel,{w, h:autoHeight(lines,sn.fs)})
                  }}
                  style={{width:'100%',accentColor:'#4DD4C1',marginBottom:8}}/>
              </div>
              <div>
                <PL>Altura: {sn.h}px</PL>
                <input type="range" min="30" max="300" value={sn.h}
                  onChange={e=>upd(sel,{h:+e.target.value})}
                  style={{width:'100%',accentColor:'#4DD4C1',marginBottom:8}}/>
              </div>
            </div>

            <PL>Cor do nó</PL>
            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8,alignItems:'center'}}>
              {PAL.map(c=>(
                <div key={c} onClick={()=>upd(sel,{bg:c})}
                  style={{width:19,height:19,borderRadius:'50%',background:c,cursor:'pointer',
                    border:`2.5px solid ${sn.bg===c?'#fff':'transparent'}`,transition:'transform .12s'}}
                  onMouseEnter={e=>e.target.style.transform='scale(1.3)'}
                  onMouseLeave={e=>e.target.style.transform=''}/>
              ))}
              <input type="color" value={sn.bg} onChange={e=>upd(sel,{bg:e.target.value})}
                style={{width:19,height:19,border:'none',borderRadius:'50%',cursor:'pointer',padding:0}}/>
            </div>

            <PL>Cor do texto</PL>
            <div style={{display:'flex',gap:4,marginBottom:8,alignItems:'center'}}>
              {['#fff','#000','#FFD700','#FF6B6B','#4DD4C1'].map(c=>(
                <div key={c} onClick={()=>upd(sel,{fg:c})}
                  style={{width:19,height:19,borderRadius:'50%',background:c,cursor:'pointer',
                    border:`2.5px solid ${sn.fg===c?'#4DD4C1':'rgba(255,255,255,.2)'}`}}/>
              ))}
              <input type="color" value={sn.fg} onChange={e=>upd(sel,{fg:e.target.value})}
                style={{width:19,height:19,border:'none',borderRadius:'50%',cursor:'pointer',padding:0}}/>
            </div>

            <PL>🔗 Link</PL>
            <input style={S.panelInput} value={sn.lk||''} placeholder="https://..."
              onChange={e=>upd(sel,{lk:e.target.value})}/>

            <PL>💬 Comentário</PL>
            <textarea style={{...S.panelInput,resize:'vertical',minHeight:54}}
              value={sn.nt||''} placeholder="Suas anotações..."
              onChange={e=>upd(sel,{nt:e.target.value})}/>

            <PL>🔷 Forma geométrica</PL>
            <div style={{fontSize:10,color:'rgba(255,255,255,.4)',marginBottom:5}}>
              Padrão: <b style={{color:'#4DD4C1'}}>{SHAPE_LIST.find(s=>s.key===defaultShape)?.label}</b>
              {sn && <> &nbsp;·&nbsp; Nó atual: <b style={{color:'#F5C16C'}}>{SHAPE_LIST.find(s=>s.key===(sn.shape||'rect'))?.label}</b></>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3,marginBottom:6}}>
              {SHAPE_LIST.map(s=>{
                const isDefault = defaultShape===s.key
                const isCurrent = sn && (sn.shape||'rect')===s.key
                return (
                  <div key={s.key} onClick={()=>setPendingShape(s.key)} title={s.label}
                    style={{background:isCurrent?'rgba(245,193,108,.2)':isDefault?'rgba(77,212,193,.15)':'rgba(255,255,255,.04)',
                      border:`1px solid ${isCurrent?'#F5C16C':isDefault?'#4DD4C1':'rgba(255,255,255,.08)'}`,
                      borderRadius:6,padding:'4px 2px',cursor:'pointer',display:'flex',
                      flexDirection:'column',alignItems:'center',gap:2,transition:'all .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'}
                    onMouseLeave={e=>e.currentTarget.style.background=isCurrent?'rgba(245,193,108,.2)':isDefault?'rgba(77,212,193,.15)':'rgba(255,255,255,.04)'}>
                    <svg width="44" height="26" style={{overflow:'visible'}}>
                      <NodeShape shape={s.key} w={44} h={26} fill={sn?.bg||'#4DD4C1'}
                        stroke={isCurrent?'#F5C16C':isDefault?'#4DD4C1':'rgba(255,255,255,.35)'}
                        strokeWidth={1.5}/>
                    </svg>
                    <span style={{fontSize:8.5,color:'rgba(255,255,255,.55)',textAlign:'center',lineHeight:1.2}}>{s.label}</span>
                  </div>
                )
              })}
            </div>
            {pendingShape && (
              <div style={{background:'rgba(245,193,108,.1)',border:'1px solid rgba(245,193,108,.3)',borderRadius:8,padding:'8px',marginBottom:8}}>
                <div style={{fontSize:11,color:'#F5C16C',marginBottom:6,fontWeight:600}}>
                  {SHAPE_LIST.find(s=>s.key===pendingShape)?.label} — aplicar onde?
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  <button style={{...S.panelBtn(false),fontSize:10,padding:'5px 3px'}}
                    onClick={()=>{snap();upd(sel,{shape:pendingShape});setPendingShape(null)}}>
                    Este nó
                  </button>
                  <button style={{...S.panelBtn(false),fontSize:10,padding:'5px 3px'}}
                    onClick={()=>{setDefaultShape(pendingShape);setPendingShape(null)}}>
                    Próximos nós
                  </button>
                  <button style={{...S.panelBtn(false),fontSize:10,padding:'5px 3px',gridColumn:'1/-1',
                    background:'rgba(77,212,193,.1)',borderColor:'rgba(77,212,193,.3)',color:'#4DD4C1'}}
                    onClick={()=>{snap();upd(sel,{shape:pendingShape});setDefaultShape(pendingShape);setPendingShape(null)}}>
                    Ambos (nó + padrão)
                  </button>
                </div>
              </div>
            )}

            <button style={{...S.panelBtn(false),width:'100%',marginBottom:8,
              background:'rgba(107,203,119,.1)',color:'#6BCB77',borderColor:'rgba(107,203,119,.3)'}}
              onClick={()=>addBinary(sel)}>
              🔀 Fluxo Sim / Não
            </button>
            {sn.img && (
              <div style={{marginBottom:8,position:'relative'}}>
                <img src={sn.img} alt="" style={{width:'100%',height:70,objectFit:'cover',borderRadius:8,display:'block'}}/>
                <button onClick={()=>{snap();upd(sel,{img:''})}}
                  style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,.75)',border:'none',
                    color:'#fff',borderRadius:5,padding:'2px 8px',cursor:'pointer',fontSize:11}}>
                  ✕ Remover
                </button>
              </div>
            )}
            <input ref={imgInputRef} type="file" accept="image/*" style={{display:'none'}}
              onChange={e=>{if(e.target.files[0]) uploadImage(e.target.files[0]); e.target.value='';}}/>
            <button style={{...S.panelBtn(false),width:'100%',marginBottom:10,opacity:uploading?.6:1}}
              disabled={uploading} onClick={()=>imgInputRef.current?.click()}>
              {uploading?'⏳ Enviando...':'📁 Escolher imagem'}
            </button>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
              <button style={S.panelBtn(false)} onClick={()=>addChild(sel)}>➕ Filho</button>
              <button style={S.panelBtn(false)} onClick={()=>addSib(sel)}>➕ Irmão</button>
              <button style={{...S.panelBtn(false),gridColumn:'1/-1'}}
                onClick={()=>{setTool('con');setCf(sel)}}>🔗 Conectar a nó</button>
              {sel!=='r' && (
                <button style={{...S.panelBtn(true),gridColumn:'1/-1'}} onClick={()=>del(sel)}>
                  🗑️ Excluir nó
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Menu de contexto ─────────────────────── */}
        {ctx && (
          <div style={{position:'fixed',left:ctx.x,top:ctx.y,zIndex:9999,
            background:'rgba(8,8,18,.97)',backdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:5,
            minWidth:185,boxShadow:'0 8px 36px rgba(0,0,0,.6)'}}
            onMouseLeave={()=>setCtx(null)}>
            {[
              ['➕ Adicionar filho  (Tab)',    ()=>addChild(ctx.id)],
              ['➕ Adicionar irmão  (Enter)',  ()=>addSib(ctx.id)],
              ['🔀 Fluxo Sim / Não',           ()=>addBinary(ctx.id)],
              ['✏️ Editar texto',               ()=>{setEdit(ctx.id);setEv(nd[ctx.id].text)}],
              ['🔗 Conectar a nó...',           ()=>{setTool('con');setCf(ctx.id)}],
              ...(xs.some(x=>x.from===ctx.id||x.to===ctx.id)
                ? [['🔓 Remover conexões extras', ()=>{snap();setXs(x=>x.filter(e=>e.from!==ctx.id&&e.to!==ctx.id))}]]
                : []),
              ...(nd[ctx.id]?.lk
                ? [['🌐 Abrir link', ()=>window.open(nd[ctx.id].lk,'_blank')]]
                : []),
            ].map(([label,fn])=>(
              <div key={label} onClick={()=>{fn();setCtx(null)}}
                style={{padding:'7px 13px',cursor:'pointer',fontSize:12,borderRadius:6,
                  color:'rgba(255,255,255,.88)',display:'flex',alignItems:'center',gap:7}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {label}
              </div>
            ))}
            {ctx.id !== 'r' && <>
              <div style={{height:1,background:'rgba(255,255,255,.08)',margin:'3px 8px'}}/>
              <div onClick={()=>{del(ctx.id);setCtx(null)}}
                style={{padding:'7px 13px',cursor:'pointer',fontSize:12,borderRadius:6,
                  color:'#ff8080',display:'flex',alignItems:'center',gap:7}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,80,80,.1)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                🗑️ Excluir nó  (Del)
              </div>
            </>}
          </div>
        )}

        {/* ── Banner modo conectar ─────────────────── */}
        {tool==='con' && (
          <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',
            background:'rgba(245,193,108,.92)',color:'#000',padding:'9px 22px',
            borderRadius:22,fontWeight:700,fontSize:13,whiteSpace:'nowrap',
            boxShadow:'0 4px 20px rgba(245,193,108,.3)'}}>
            🔗 {cf ? `De: "${nd[cf]?.text}" → clique no nó destino` : 'Clique no nó de origem'} &nbsp;·&nbsp; ESC para cancelar
          </div>
        )}

        {/* ── Modal de preview de imagem ───────────── */}
        {previewImg && (
          <div onClick={()=>setPreviewImg(null)}
            style={{position:'fixed',inset:0,zIndex:99999,
              background:'rgba(0,0,0,.88)',display:'flex',
              alignItems:'center',justifyContent:'center',
              cursor:'zoom-out',backdropFilter:'blur(6px)'}}>
            <div onClick={e=>e.stopPropagation()}
              style={{position:'relative',maxWidth:'90vw',maxHeight:'90vh'}}>
              <img src={previewImg} alt=""
                style={{maxWidth:'90vw',maxHeight:'88vh',borderRadius:12,
                  display:'block',boxShadow:'0 20px 60px rgba(0,0,0,.6)',
                  objectFit:'contain'}}/>
              <button onClick={()=>setPreviewImg(null)}
                style={{position:'absolute',top:-14,right:-14,width:32,height:32,
                  background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.2)',
                  color:'#fff',borderRadius:'50%',cursor:'pointer',
                  fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',
                  backdropFilter:'blur(8px)'}}>✕</button>
              <div style={{textAlign:'center',marginTop:10,color:'rgba(255,255,255,.4)',fontSize:12}}>
                Clique fora ou pressione ESC para fechar
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper: label do painel
function PL({ children }) {
  return <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:3}}>{children}</div>
}

// ════════════════════════════════════════════════════════
//  APP PRINCIPAL
// ════════════════════════════════════════════════════════
export default function App() {
  const [token,    setToken]    = useState(localStorage.getItem(TOKEN_KEY))
  const [user,     setUser]     = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } })
  const [screen,   setScreen]   = useState(localStorage.getItem(TOKEN_KEY) ? 'list' : 'auth')
  const [mapId,    setMapId]    = useState(null)
  const [mapTitle, setMapTitle] = useState('')

  const handleLogin = (tok, usr) => {
    setToken(tok); setUser(usr); setScreen('list')
  }
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null); setUser(null); setScreen('auth')
  }
  const handleOpen = (id, title) => {
    setMapId(id); setMapTitle(title); setScreen('editor')
  }
  const handleBack = () => setScreen('list')

  if (screen === 'auth')   return <AuthScreen    onLogin={handleLogin}/>
  if (screen === 'list')   return <MapListScreen user={user} onOpen={handleOpen} onLogout={handleLogout}/>
  if (screen === 'editor') return <MapEditor     mapId={mapId} mapTitle={mapTitle} onBack={handleBack}/>
  return null
}
