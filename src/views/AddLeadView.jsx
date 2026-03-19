import T from '../lib/theme';

export default function AddLeadView({ newLead, setNewLead, canSaveLead, savingLead, saveLead, onBack }) {
  return (
          <div style={{padding:"24px 32px",maxWidth:640,margin:"0 auto"}}>
            <div onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:15,color:T.s,cursor:"pointer",marginBottom:16}}>← Back</div>
            <h1 style={{fontSize:28,fontWeight:800,margin:"0 0 24px"}}>Add New Lead</h1>
            <div style={{background:T.card,borderRadius:12,padding:"28px 30px",border:`1px solid ${T.b}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}} className="form-grid">
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>FIRST NAME *</div><input autoComplete="off" value={newLead.first_name} onChange={ev=>setNewLead(p=>({...p,first_name:ev.target.value}))} placeholder="First Name" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${newLead.first_name.trim()?T.a+"30":T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>LAST NAME</div><input autoComplete="off" value={newLead.last_name} onChange={ev=>setNewLead(p=>({...p,last_name:ev.target.value}))} placeholder="Last Name" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>PHONE {!newLead.email.trim()?"*":""}</div><input autoComplete="off" value={newLead.phone} onChange={ev=>setNewLead(p=>({...p,phone:ev.target.value}))} placeholder="(555) 123-4567" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${newLead.phone.trim()?T.a+"30":T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>EMAIL {!newLead.phone.trim()?"*":""}</div><input autoComplete="off" value={newLead.email} onChange={ev=>setNewLead(p=>({...p,email:ev.target.value}))} placeholder="agent@email.com" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${newLead.email.trim()?T.a+"30":T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>MARKET</div><input autoComplete="off" value={newLead.market} onChange={ev=>setNewLead(p=>({...p,market:ev.target.value}))} placeholder="Austin, TX" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BROKERAGE</div><input autoComplete="off" value={newLead.brokerage} onChange={ev=>setNewLead(p=>({...p,brokerage:ev.target.value}))} placeholder="Current Brokerage" style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
                <div style={{gridColumn:"1/3"}}><div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>SOURCE</div><select value={newLead.source} onChange={ev=>setNewLead(p=>({...p,source:ev.target.value}))} style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}><option value="">Select source...</option>{["Manual","Referral","Facebook Ad","Instagram Ad","GHL Webhook","LinkedIn","Cold Outreach","Event","Open House","Other"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:T.m,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>NOTES</div>
                <textarea value={newLead.notes} onChange={ev=>setNewLead(p=>({...p,notes:ev.target.value}))} placeholder="Where you met them, what they said, any context..." rows={3} style={{width:"100%",padding:"14px 16px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:16,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box",lineHeight:1.5}}/>
              </div>
              {!canSaveLead&&(newLead.first_name.trim()||newLead.phone.trim()||newLead.email.trim())&&<div style={{fontSize:12,color:"#F59E0B",marginBottom:12}}>Please enter a name and at least a phone or email.</div>}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div onClick={()=>{if(canSaveLead&&!savingLead)saveLead(true);}} style={{padding:"14px 28px",borderRadius:8,background:canSaveLead&&!savingLead?T.a:"#333",color:canSaveLead&&!savingLead?"#000":T.m,fontSize:16,fontWeight:700,cursor:canSaveLead&&!savingLead?"pointer":"default",display:"flex",alignItems:"center",gap:8,pointerEvents:savingLead?"none":"auto"}}>{savingLead?"Saving...":"🔍 Save & Research with RUE"}</div>
                <div onClick={()=>{if(canSaveLead&&!savingLead)saveLead(false);}} style={{padding:"14px 28px",borderRadius:8,background:T.card,border:`1px solid ${T.b}`,color:T.s,fontSize:16,fontWeight:700,cursor:canSaveLead&&!savingLead?"pointer":"default",opacity:canSaveLead&&!savingLead?1:0.4,pointerEvents:savingLead?"none":"auto"}}>{savingLead?"Saving...":"Save to CRM"}</div>
              </div>
            </div>
          </div>
  );
}
