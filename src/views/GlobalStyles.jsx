import T from '../lib/theme';

function GlobalStyles() {
  return (
    <style>{`
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes rueGlow{0%,100%{filter:drop-shadow(0 0 4px #00E5A0) drop-shadow(0 0 8px #00E5A060)}50%{filter:drop-shadow(0 0 8px #00E5A0) drop-shadow(0 0 16px #00E5A080)}}
.ftb-item:hover .ftb-label{max-width:120px!important;opacity:1!important;margin-left:10px!important}
.ftb-item:hover{background:rgba(255,255,255,0.06)!important;padding-right:16px!important}
textarea::placeholder,input::placeholder{color:${T.m}}
html,body{overflow-x:hidden}
*{box-sizing:border-box}
.leads-desktop{display:block}
.leads-mobile{display:none}
select option{background:${T.card};color:${T.t}}
@media(min-width:769px) and (max-width:1200px){
  .content-grid{grid-template-columns:repeat(2,1fr)!important}
}
@media(max-width:768px){
.app-sidebar{position:fixed!important;left:0!important;top:0!important;bottom:0!important;transform:translateX(-100%);transition:transform 0.25s ease;z-index:1000;width:72px!important;height:100vh}
.app-sidebar.open{transform:translateX(0)!important}
.main-scroll{padding:14px 16px!important}
.hamburger-btn{display:flex!important}
.page-header{flex-direction:column!important;align-items:flex-start!important}
.kpi-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}
.kpi-card{padding:12px!important;gap:8px!important;min-width:0!important}
.kpi-icon{width:36px!important;height:36px!important;font-size:16px!important;flex-shrink:0!important}
.kpi-val{font-size:22px!important}
.kpi-label{font-size:10px!important;letter-spacing:1px!important}
.quick-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
.content-grid{grid-template-columns:1fr!important}
.content-ctrl-row{flex-direction:column!important;align-items:stretch!important}
.content-ctrl-row input,.content-ctrl-row>div{width:100%!important;box-sizing:border-box!important}
.two-col{grid-template-columns:1fr!important}
.four-col{grid-template-columns:1fr!important}
.kanban-wrap{flex-direction:column!important}
.kanban-wrap>div{min-width:100%!important}
.crm-table{font-size:13px!important}
.crm-table td,.crm-table th{padding:10px 8px!important}
.pipe-toolbar{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
.pipe-toolbar input,.pipe-toolbar select{width:100%!important}
.pipe-spacer{display:none!important}
.agent-search-btns{width:100%!important}
.crm-toolbar{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
.crm-spacer{display:none!important}
.generate-btn{justify-content:center!important}
.content-filter-tabs{gap:0!important}
.content-filter-tabs>div{flex:1!important}
.newly-licensed-row>div:first-child{width:100%!important}
.leads-desktop{display:none!important}
.leads-mobile{display:block!important}
.content-header-outer{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
.ask-rue-grid{grid-template-columns:1fr!important}
.pipe-stats{gap:4px!important}
.pipe-stats>div{padding:8px 4px!important}
.form-grid{grid-template-columns:1fr!important}
.form-grid>div[style*="grid-column"]{grid-column:1!important}
*{word-break:break-word;overflow-wrap:anywhere}
}`}</style>
  );
}

export default GlobalStyles;
