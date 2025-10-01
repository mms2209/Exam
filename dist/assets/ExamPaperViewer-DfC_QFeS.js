import{c as b,w as T,v as U,r as d,t as c,j as e,F as D,M as k,A as L}from"./index-DTq_MSHf.js";import{u as _}from"./useQuery-jHUkFj9r.js";import{u as G}from"./useMutation-ChvwOYZS.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=b("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=b("Loader2",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=b("Send",[["path",{d:"m22 2-7 20-4-9-9-4Z",key:"1q3vgg"}],["path",{d:"M22 2 11 13",key:"nzbqef"}]]);function z(){var M;const{paperId:i}=T(),A=U(),[N,I]=d.useState(null),[f,v]=d.useState([]),[u,w]=d.useState(""),[$,P]=d.useState(null),[E,y]=d.useState(null),{data:l,isLoading:F}=_({queryKey:["exam-paper",i],queryFn:()=>c.getExamPaperById(i),enabled:!!i}),{data:h}=_({queryKey:["chat-session",i],queryFn:()=>c.getChatSession(i),enabled:!!i});d.useEffect(()=>{h&&(P(h.id),v(h.messages||[]))},[h]),d.useEffect(()=>{l&&(c.trackPaperAccess(l.id),c.getPaperFileUrl(l.paper_file_url).then(t=>{t&&I(t)}))},[l]);const m=G({mutationFn:async t=>{var p,x,g,S;const a={id:crypto.randomUUID(),role:"user",content:t,timestamp:new Date().toISOString()};y(null);const s=await c.getExamPaperWithText(i);let r="",n="";s.text_extraction_status==="completed"?(s.paper_extracted_text&&(r=`
Exam Paper: ${s.title||"Untitled"}
Subject: ${(p=s.subject)==null?void 0:p.name}
Year: ${s.year}
Paper Number: ${s.paper_number}

=== EXAM PAPER CONTENT ===
${s.paper_extracted_text}
=== END OF EXAM PAPER ===

The student is asking about a specific question from this exam paper.
`),s.marking_scheme_extracted_text&&(n=`
=== MARKING SCHEME ===
${s.marking_scheme_extracted_text}
=== END OF MARKING SCHEME ===

Use this marking scheme to provide accurate guidance on how to get full marks.
`)):s.text_extraction_status==="processing"?(r=`
Exam Paper: ${s.title||"Untitled"}
Subject: ${(x=s.subject)==null?void 0:x.name}
Year: ${s.year}
Paper Number: ${s.paper_number}

Note: PDF text is currently being extracted. Please try again in a few moments for more detailed assistance.
`,n="PDF text extraction is in progress. Please wait and try again shortly."):s.text_extraction_status==="pending"?(r=`
Exam Paper: ${s.title||"Untitled"}
Subject: ${(g=s.subject)==null?void 0:g.name}
Year: ${s.year}
Paper Number: ${s.paper_number}

Note: PDF text extraction has not started yet. The AI will provide general guidance based on your question.
`,n="PDF text extraction is pending. General guidance will be provided."):(r=`
Exam Paper: ${s.title||"Untitled"}
Subject: ${(S=s.subject)==null?void 0:S.name}
Year: ${s.year}
Paper Number: ${s.paper_number}

Note: PDF text extraction failed. The AI will provide general educational guidance.
Error: ${s.extraction_error||"Unknown error"}
`,n="PDF text could not be extracted. Providing general educational guidance.");const o=await c.sendChatMessage({paperId:i,question:t,paperContent:r,markingSchemeContent:n});return{userMessage:a,response:o}},onSuccess:async t=>{const{userMessage:a,response:s}=t,r=s.message;v(o=>{const p=new Set(o.map(g=>g.id)),x=[];return p.has(a.id)||x.push(a),p.has(r.id)||x.push(r),[...o,...x]});let n=$;if(!n&&i&&(n=(await c.createChatSession(i)).id,P(n)),n){const o=[...f,a,r];await c.updateChatSession(n,o)}},onError:t=>{let a="Unable to get a response from the AI tutor. Please try again.";t.status===503?a="AI service is currently unavailable. Please contact your administrator to configure the service.":t.status===429?a="AI service quota exceeded. Please try again later.":t.message&&(a=t.message),y(a)}}),C=t=>{t.preventDefault(),u.trim()&&!m.isPending&&(m.mutate(u),w(""))},q=t=>{try{return JSON.parse(t)}catch{return null}};return F?e.jsx("div",{className:"flex items-center justify-center py-12",children:e.jsx(j,{className:"h-8 w-8 animate-spin text-emerald-600"})}):l?e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("button",{onClick:()=>A("/app/exam-papers"),className:"inline-flex items-center text-sm text-gray-600 hover:text-gray-900",children:[e.jsx(R,{className:"h-4 w-4 mr-1"}),"Back to Papers"]}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("h1",{className:"text-xl font-bold text-gray-900",children:[(M=l.subject)==null?void 0:M.name," - Paper ",l.paper_number," (",l.year,")"]}),l.title&&e.jsx("p",{className:"text-sm text-gray-600 mt-1",children:l.title})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-250px)]",children:[e.jsxs("div",{className:"bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden",children:[e.jsxs("div",{className:"bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center",children:[e.jsx(D,{className:"h-5 w-5 text-gray-600 mr-2"}),e.jsx("span",{className:"font-medium text-gray-900",children:"Exam Paper"})]}),e.jsx("div",{className:"h-full overflow-auto p-4",children:N?e.jsx("iframe",{src:N,className:"w-full h-full border-0",title:"Exam Paper"}):e.jsx("div",{className:"flex items-center justify-center h-full",children:e.jsx(j,{className:"h-8 w-8 animate-spin text-gray-400"})})})]}),e.jsxs("div",{className:"bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col",children:[e.jsxs("div",{className:"bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center",children:[e.jsx(k,{className:"h-5 w-5 text-gray-600 mr-2"}),e.jsx("span",{className:"font-medium text-gray-900",children:"AI Tutor"})]}),e.jsxs("div",{className:"flex-1 overflow-auto p-4 space-y-4",children:[E&&e.jsxs("div",{className:"bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3",children:[e.jsx(L,{className:"h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"text-sm text-red-800 font-medium",children:"Error"}),e.jsx("p",{className:"text-sm text-red-700 mt-1",children:E})]}),e.jsx("button",{onClick:()=>y(null),className:"text-red-400 hover:text-red-600",children:e.jsx("svg",{className:"h-5 w-5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),f.length===0?e.jsxs("div",{className:"text-center py-12 text-gray-500",children:[e.jsx(k,{className:"h-12 w-12 mx-auto mb-3 text-gray-400"}),e.jsx("p",{className:"text-sm mb-2",children:"Ask the AI tutor about any question!"}),e.jsx("p",{className:"text-xs text-gray-400",children:'Example: "Explain question 5" or "How do I solve question 3?"'})]}):f.map(t=>{const a=t.role==="assistant"?q(t.content):null;return e.jsx("div",{className:`flex ${t.role==="user"?"justify-end":"justify-start"}`,children:e.jsx("div",{className:`max-w-[85%] rounded-lg px-4 py-3 ${t.role==="user"?"bg-emerald-600 text-white":"bg-gray-100 text-gray-900"}`,children:t.role==="user"?e.jsx("p",{className:"text-sm",children:t.content}):a?e.jsxs("div",{className:"space-y-3 text-sm",children:[a.explanation&&e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Explanation"}),e.jsx("p",{className:"text-gray-700",children:a.explanation})]}),a.examples&&a.examples.length>0&&e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Examples"}),e.jsx("ul",{className:"list-disc list-inside space-y-1 text-gray-700",children:a.examples.map((s,r)=>e.jsx("li",{children:s},r))})]}),a.howToGetFullMarks&&a.howToGetFullMarks.length>0&&e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-1",children:"How to Get Full Marks"}),e.jsx("ul",{className:"list-disc list-inside space-y-1 text-gray-700",children:a.howToGetFullMarks.map((s,r)=>e.jsx("li",{children:s},r))})]}),a.solution&&e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Solution"}),e.jsx("p",{className:"text-gray-700 whitespace-pre-wrap",children:a.solution})]})]}):e.jsx("p",{className:"text-sm",children:t.content})})},t.id)}),m.isPending&&e.jsx("div",{className:"flex justify-start",children:e.jsx("div",{className:"bg-gray-100 rounded-lg px-4 py-3",children:e.jsx(j,{className:"h-5 w-5 animate-spin text-gray-600"})})})]}),e.jsx("div",{className:"border-t border-gray-200 p-4",children:e.jsxs("form",{onSubmit:C,className:"flex gap-2",children:[e.jsx("input",{type:"text",value:u,onChange:t=>w(t.target.value),placeholder:"Ask about a specific question...",className:"flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500",disabled:m.isPending}),e.jsx("button",{type:"submit",disabled:!u.trim()||m.isPending,className:"inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed",children:e.jsx(H,{className:"h-4 w-4"})})]})})]})]})]}):e.jsx("div",{className:"text-center py-12",children:e.jsx("p",{className:"text-gray-600",children:"Exam paper not found"})})}export{z as ExamPaperViewer};
