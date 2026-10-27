// Pruebas de las reglas con el EMULADOR de Firestore (no toca tu proyecto real).
// Uso:  npm i -D @firebase/rules-unit-testing firebase   y luego
//       npx firebase-tools emulators:exec --only firestore "node --test test_reglas.mjs"
// (requiere Java y firebase.json con {"firestore":{"rules":"firestore_corregido_v2.rules"}})
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc,collection,query,where,serverTimestamp,addDoc} from 'firebase/firestore';
import {readFileSync} from 'node:fs';
import {test,before,after} from 'node:test';

let env;const PID='595983897999';
const biz=(o={})=>({ownerUid:'prov1',name:'Negocio X',ownerName:'Luis Gomez',city:'Asunción',whatsapp:PID,products:'Remeras',categories:['Ropa'],shipping:'pais',shippingNotes:'',instagram:'',website:'',imports:false,exports:false,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...o});
const tok=(extra={})=>({email_verified:true,email:'x@ex.com',...extra});
const as=(uid,t=tok())=>env.authenticatedContext(uid,t).firestore();
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-mp',firestore:{rules:readFileSync('firestore_corregido_v2.rules','utf8')}});
  await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();
    await setDoc(doc(d,'users/buyer1'),{name:'Ana Perez',email:'x@ex.com',role:'buyer',createdAt:new Date()});
    await setDoc(doc(d,'users/buyer2'),{name:'Bea Lopez',email:'x@ex.com',role:'buyer',createdAt:new Date()});
    await setDoc(doc(d,'users/prov1'),{name:'Luis Gomez',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/prov2'),{name:'Eva Ruiz',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/prov4'),{name:'Prov Cinco',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/prov5'),{name:'Prov Cinco',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/prov6'),{name:'Prov Cinco',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/prov7'),{name:'Prov Cinco',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/prov8'),{name:'Prov Cinco',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/prov3'),{name:'Pablo Diaz',email:'x@ex.com',role:'provider',createdAt:new Date()});
    await setDoc(doc(d,'users/adm1'),{name:'Admin Uno',email:'x@ex.com',role:'buyer',createdAt:new Date()});
    await setDoc(doc(d,'admins/adm1'),{activo:true});
    await setDoc(doc(d,'businessRequests/prov1'),{...biz({createdAt:new Date(),updatedAt:new Date()})});
    await setDoc(doc(d,'businessRequests/prov2'),{...biz({ownerUid:'prov2',status:'approved',createdAt:new Date(),updatedAt:new Date()})});
    await setDoc(doc(d,'reviews/'+PID+'_buyer2'),{providerId:PID,rating:5,text:'Muy bueno',authorUid:'buyer2',authorName:'Bea L.',authorType:'registered',verifiedPurchase:false,status:'approved',createdAt:new Date()});
    await setDoc(doc(d,'reviews/111111111_buyer2'),{providerId:'111111111',rating:3,text:'Pendiente',authorUid:'buyer2',authorName:'Bea L.',authorType:'registered',verifiedPurchase:false,status:'pending',createdAt:new Date()});
  });
});
after(()=>env.cleanup());
const rev=(o={})=>({providerId:PID,rating:4,text:'Buen proveedor',authorUid:'buyer1',authorName:'Ana P.',authorType:'registered',verifiedPurchase:false,status:'pending',createdAt:serverTimestamp(),...o});

// ---- Perfiles / admin
test('usuario crea su perfil como buyer o provider',async()=>{await assertSucceeds(setDoc(doc(as('n1'),'users/n1'),{name:'Nuevo Usuario',email:'x@ex.com',role:'buyer',createdAt:serverTimestamp()}))});
test('nadie se asigna rol admin',async()=>{await assertFails(setDoc(doc(as('n2'),'users/n2'),{name:'Nuevo Usuario',email:'x@ex.com',role:'admin',createdAt:serverTimestamp()}))});
test('nadie crea su documento en admins',async()=>{await assertFails(setDoc(doc(as('n3'),'admins/n3'),{activo:true}))});
test('no se puede cambiar el rol',async()=>{await assertFails(updateDoc(doc(as('buyer1'),'users/buyer1'),{role:'provider'}))});
test('cada uno lee su perfil, no el ajeno',async()=>{await assertSucceeds(getDoc(doc(as('buyer1'),'users/buyer1')));await assertFails(getDoc(doc(as('buyer1'),'users/buyer2')))});
test('admin lee cualquier perfil',async()=>{await assertSucceeds(getDoc(doc(as('adm1'),'users/buyer1')))});
test('no se pueden listar usuarios',async()=>{await assertFails(getDocs(collection(as('adm1'),'users')))});
// ---- Negocios
test('mayorista verificado envía su negocio pendiente',async()=>{await assertSucceeds(setDoc(doc(as('prov3'),'businessRequests/prov3'),biz({ownerUid:'prov3'})))});
test('mayorista sin correo verificado NO envía',async()=>{await assertFails(setDoc(doc(as('prov1',tok({email_verified:false})),'businessRequests/prov1x'),biz()))});
test('comprador NO crea negocios',async()=>{await assertFails(setDoc(doc(as('buyer1'),'businessRequests/buyer1'),biz({ownerUid:'buyer1'})))});
test('mayorista NO se aprueba solo',async()=>{await assertFails(updateDoc(doc(as('prov1'),'businessRequests/prov1'),{status:'approved',updatedAt:serverTimestamp()}))});
test('mayorista NO crea con status approved',async()=>{await assertFails(setDoc(doc(as('prov3'),'businessRequests/prov3'),biz({ownerUid:'prov3',status:'approved'})))});
test('mayorista NO edita negocio ajeno',async()=>{await assertFails(updateDoc(doc(as('prov1'),'businessRequests/prov2'),{name:'Hack',status:'pending',updatedAt:serverTimestamp()}))});
test('mayorista edita el suyo (no aprobado) y queda pending',async()=>{await assertSucceeds(updateDoc(doc(as('prov1'),'businessRequests/prov1'),{name:'Nuevo nombre',status:'pending',updatedAt:serverTimestamp()}))});
test('mayorista NO edita directo si está aprobado',async()=>{await assertFails(updateDoc(doc(as('prov2'),'businessRequests/prov2'),{name:'Otro',status:'pending',updatedAt:serverTimestamp()}))});
test('admin aprueba/rechaza',async()=>{await assertSucceeds(updateDoc(doc(as('adm1'),'businessRequests/prov1'),{status:'approved',reviewedBy:'adm1',reviewedAt:serverTimestamp()}))});
test('admin NO cambia otros campos',async()=>{await assertFails(updateDoc(doc(as('adm1'),'businessRequests/prov1'),{name:'X',status:'approved'}))});
test('comprador lee negocio aprobado',async()=>{await assertSucceeds(getDoc(doc(as('buyer1'),'businessRequests/prov2')))});
test('comprador lista SOLO aprobados',async()=>{await assertSucceeds(getDocs(query(collection(as('buyer1'),'businessRequests'),where('status','==','approved'))))});
test('comprador NO lista pendientes ni todo',async()=>{await assertFails(getDocs(query(collection(as('buyer1'),'businessRequests'),where('status','==','pending'))));await assertFails(getDocs(collection(as('buyer1'),'businessRequests')))});
test('comprador NO lee negocio pendiente de otro',async()=>{await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'businessRequests/pend9'),biz({ownerUid:'pend9',createdAt:new Date(),updatedAt:new Date()})));await assertFails(getDoc(doc(as('buyer1'),'businessRequests/pend9')))});
test('admin lista pendientes',async()=>{await assertSucceeds(getDocs(query(collection(as('adm1'),'businessRequests'),where('status','==','pending'))))});
// ---- Cambios
test('mayorista APROBADO solicita cambio',async()=>{await assertSucceeds(addDoc(collection(as('prov2'),'changeRequests'),{ownerUid:'prov2',message:'Cambiar teléfono',status:'pending',createdAt:serverTimestamp()}))});
test('mayorista NO aprobado no solicita cambio',async()=>{await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'businessRequests/prov1'),biz({status:'pending',createdAt:new Date(),updatedAt:new Date()})));await assertFails(addDoc(collection(as('prov1'),'changeRequests'),{ownerUid:'prov1',message:'Cambiar teléfono',status:'pending',createdAt:serverTimestamp()}))});
test('comprador no solicita cambios',async()=>{await assertFails(addDoc(collection(as('buyer1'),'changeRequests'),{ownerUid:'buyer1',message:'Cambiar algo',status:'pending',createdAt:serverTimestamp()}))});
// ---- v2: campos nuevos y cambios con revisión
test('v2: negocio con Instagram y web válidos',async()=>{await assertSucceeds(setDoc(doc(as('prov4'),'businessRequests/prov4'),biz({ownerUid:'prov4',instagram:'mi.negocio_py',website:'https://mi-negocio.com.py'})))});
test('v2: web sin http(s) se rechaza',async()=>{await assertFails(setDoc(doc(as('prov5'),'businessRequests/prov5'),biz({ownerUid:'prov5',website:'javascript:alert(1)'})))});
test('v2: Instagram con caracteres inválidos se rechaza',async()=>{await assertFails(setDoc(doc(as('prov6'),'businessRequests/prov6'),biz({ownerUid:'prov6',instagram:'@con espacio'})))});
test('v2: falta el responsable se rechaza',async()=>{const b=biz({ownerUid:'prov7'});delete b.ownerName;await assertFails(setDoc(doc(as('prov7'),'businessRequests/prov7'),b))});
test('v2: campo desconocido se rechaza',async()=>{await assertFails(setDoc(doc(as('prov8'),'businessRequests/prov8'),biz({ownerUid:'prov8',fotoUrl:'https://x.com/a.jpg'})))});
test('v2: mayorista aprobado pide cambio con changes válidos',async()=>{await assertSucceeds(addDoc(collection(as('prov2'),'changeRequests'),{ownerUid:'prov2',message:'Actualización de datos de contacto',changes:{whatsapp:'595981000111',instagram:'nuevo_ig'},status:'pending',createdAt:serverTimestamp()}))});
test('v2: changes con campo sensible (name) se rechaza',async()=>{await assertFails(addDoc(collection(as('prov2'),'changeRequests'),{ownerUid:'prov2',message:'Cambiar nombre',changes:{name:'Otro'},status:'pending',createdAt:serverTimestamp()}))});
test('v2: changes con web inválida se rechaza',async()=>{await assertFails(addDoc(collection(as('prov2'),'changeRequests'),{ownerUid:'prov2',message:'Cambiar web',changes:{website:'ftp://x.com'},status:'pending',createdAt:serverTimestamp()}))});
test('v2: changes vacío se rechaza',async()=>{await assertFails(addDoc(collection(as('prov2'),'changeRequests'),{ownerUid:'prov2',message:'Cambio vacio',changes:{},status:'pending',createdAt:serverTimestamp()}))});
test('v2: admin aplica cambios de contacto (sin cambiar estado)',async()=>{await assertSucceeds(updateDoc(doc(as('adm1'),'businessRequests/prov2'),{whatsapp:'595981000111',instagram:'nuevo_ig',updatedAt:serverTimestamp()}))});
test('v2: admin NO cambia el nombre por esta vía',async()=>{await assertFails(updateDoc(doc(as('adm1'),'businessRequests/prov2'),{name:'Hack',updatedAt:serverTimestamp()}))});
test('v2: admin NO cambia el estado junto con datos',async()=>{await assertFails(updateDoc(doc(as('adm1'),'businessRequests/prov2'),{status:'rejected',whatsapp:'595981000222',updatedAt:serverTimestamp()}))});
test('v2: mayorista NO aplica cambios en su negocio aprobado',async()=>{await assertFails(updateDoc(doc(as('prov2'),'businessRequests/prov2'),{whatsapp:'595981000333',status:'pending',updatedAt:serverTimestamp()}))});
test('v2: comprador NO aplica cambios',async()=>{await assertFails(updateDoc(doc(as('buyer1'),'businessRequests/prov2'),{whatsapp:'595981000444',updatedAt:serverTimestamp()}))});
// ---- Opiniones
test('comprador verificado envía opinión pending',async()=>{await assertSucceeds(setDoc(doc(as('buyer1'),'reviews/'+PID+'_buyer1'),rev()))});
test('segunda opinión del mismo comprador al mismo mayorista: bloqueada',async()=>{await assertFails(setDoc(doc(as('buyer1'),'reviews/'+PID+'_buyer1'),rev({text:'Otra vez'})))});
test('no se puede usar otro id para duplicar',async()=>{await assertFails(setDoc(doc(as('buyer1'),'reviews/'+PID+'_buyer1_2'),rev()))});
test('comprador no se auto-aprueba',async()=>{await assertFails(setDoc(doc(as('buyer1'),'reviews/222222222_buyer1'),rev({providerId:'222222222',status:'approved'})))});
test('mayorista no opina',async()=>{await assertFails(setDoc(doc(as('prov1'),'reviews/'+PID+'_prov1'),rev({authorUid:'prov1'})))});
test('sin correo verificado no opina',async()=>{await assertFails(setDoc(doc(as('buyer1',tok({email_verified:false})),'reviews/333333333_buyer1'),rev({providerId:'333333333'})))});
test('puntuación fuera de rango',async()=>{await assertFails(setDoc(doc(as('buyer1'),'reviews/444444444_buyer1'),rev({providerId:'444444444',rating:6})))});
test('visitante sin sesión lee opiniones aprobadas',async()=>{await assertSucceeds(getDocs(query(collection(env.unauthenticatedContext().firestore(),'reviews'),where('providerId','==',PID),where('status','==','approved'))))});
test('visitante NO lee pendientes',async()=>{await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'reviews/111111111_buyer2')))});
test('otro comprador NO lee pendiente ajena',async()=>{await assertFails(getDoc(doc(as('buyer1'),'reviews/111111111_buyer2')))});
test('autor lee su pendiente',async()=>{await assertSucceeds(getDoc(doc(as('buyer2'),'reviews/111111111_buyer2')))});
test('autor NO edita su opinión',async()=>{await assertFails(updateDoc(doc(as('buyer2'),'reviews/111111111_buyer2'),{rating:5}))});
test('admin aprueba opinión',async()=>{await assertSucceeds(updateDoc(doc(as('adm1'),'reviews/111111111_buyer2'),{status:'approved',reviewedBy:'adm1',reviewedAt:serverTimestamp()}))});
test('comprador NO aprueba opiniones',async()=>{await assertFails(updateDoc(doc(as('buyer1'),'reviews/'+PID+'_buyer2'),{status:'approved'}))});
// ---- Colecciones inventadas
test('colecciones no previstas: denegado',async()=>{await assertFails(setDoc(doc(as('adm1'),'otra/x'),{a:1}))});
