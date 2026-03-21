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
.app-sidebar{display:none!important}
.floating-toolbar{display:none!important}
.main-scroll{padding:14px 16px 80px!important}
.hamburger-btn{display:flex!important}
.page-header{flex-direction:column!important;align-items:flex-start!important}
.mobile-nav-menu{display:flex!important}
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
.auth-left .features-list{display:none!important}
.onboard-card{padding:28px 20px!important}
.getting-started-grid{grid-template-columns:1fr!important}
.hottest-stats{grid-template-columns:1fr 1fr!important;gap:8px!important}
.hottest-stats>div{padding:10px 12px!important}
.hottest-podium{grid-template-columns:1fr!important}
.lead-header{flex-direction:column!important;gap:12px!important}
.lead-header>div:last-child{width:100%!important}
.lead-header>div:last-child>div{flex:1!important}
.lead-actions-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
.lead-layout{grid-template-columns:1fr!important}
.lead-contact-grid{grid-template-columns:1fr!important}
.lead-tabs{flex-wrap:wrap!important}
.email-sidebar{width:100vw!important}
.agent-filter-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}
.agent-filter-grid>div:last-child{grid-column:1/-1!important}
.agent-stats-bar{flex-wrap:wrap!important}
.agent-stats-bar>div{flex:1 1 calc(50% - 5px)!important;min-width:0!important}
.progate-tiers{flex-direction:column!important;align-items:stretch!important}
.progate-tiers>div{width:auto!important}
.profile-header{flex-direction:column!important;align-items:center!important;text-align:center!important;gap:16px!important}
.profile-stats{grid-template-columns:1fr 1fr!important;gap:8px!important}
.profile-form-grid{grid-template-columns:1fr!important}
.profile-form-grid>div[style*="grid-column"]{grid-column:1!important}
.content-tabs{flex-wrap:wrap!important;gap:6px!important}
.content-tabs>div{flex:1 1 auto!important;text-align:center!important;padding:10px 12px!important;font-size:12px!important}
.daily-content-grid{grid-template-columns:1fr!important}
.landing-page-row{flex-direction:column!important;gap:8px!important}
.landing-page-row .lp-actions{flex-direction:column!important;width:100%!important}
.landing-page-row .lp-actions>*{width:100%!important;text-align:center!important}
.video-row{grid-template-columns:1fr!important}
.blog-link-row{flex-direction:column!important;gap:10px!important}
.blog-link-actions{flex-direction:column!important;width:100%!important}
.community-layout{grid-template-columns:1fr!important}
.community-sidebar{display:none!important}
.challenges-layout{grid-template-columns:1fr!important}
.challenges-sidebar{display:none!important}
.profile-menu-popup{left:16px!important;right:16px!important;width:auto!important;bottom:72px!important}
.preview-panel{width:100vw!important}
.crm-hottest-stats{grid-template-columns:1fr 1fr!important;gap:8px!important}
.overdue-warning{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
.toast-center{left:16px!important;right:16px!important;transform:none!important;text-align:center!important}
.crm-table .crm-col-email,.crm-table .crm-col-market,.crm-table .crm-col-brokerage,.crm-table .crm-col-tier,.crm-table .crm-col-urgency,.crm-table .crm-col-source,.crm-table .crm-col-added,.crm-table .crm-col-score,.crm-table .crm-col-check{display:none!important}
.crm-table{min-width:0!important}
.agent-filter-grid{grid-template-columns:1fr!important}
.agent-filter-grid>div:last-child{grid-column:1!important}
.content-tabs>div{min-width:60px!important}
.content-action-btns{flex-direction:column!important}
.content-action-btns>*{min-width:0!important;width:100%!important;text-align:center!important;white-space:nowrap!important}
}`}</style>
  );
}

export default GlobalStyles;
