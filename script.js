const btn=document.querySelector(".menu-toggle");
const nav=document.querySelector(".nav-list");
if(btn&&nav){
  btn.addEventListener("click",()=>{const open=nav.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));});
  nav.querySelectorAll("a").forEach((a)=>a.addEventListener("click",()=>{nav.classList.remove("open");btn.setAttribute("aria-expanded","false");}));
}

document.querySelectorAll(".nav-dropdown .dropdown-toggle").forEach((toggle)=>{
  toggle.addEventListener("click",(e)=>{
    e.preventDefault();
    const parent=toggle.closest(".nav-dropdown");
    if(!parent) return;
    const willOpen=!parent.classList.contains("open");
    document.querySelectorAll(".nav-dropdown.open").forEach((item)=>{
      if(item!==parent){
        item.classList.remove("open");
        const itemBtn=item.querySelector(".dropdown-toggle");
        if(itemBtn) itemBtn.setAttribute("aria-expanded","false");
      }
    });
    parent.classList.toggle("open",willOpen);
    toggle.setAttribute("aria-expanded",String(willOpen));
  });
});

const toRad=(d)=>d*Math.PI/180;
const distanceKm=(a,b)=>{
  const R=6371;
  const dLat=toRad(b.lat-a.lat);
  const dLng=toRad(b.lng-a.lng);
  const aa=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(aa));
};
const initials=(name)=>name.split(" ").map((n)=>n[0]).slice(0,2).join("").toUpperCase();
const avatarData=(name)=>{
  const label=initials(name)||"BL";
  const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23964fe0'/><stop offset='100%' stop-color='%23611db0'/></linearGradient></defs><rect width='96' height='96' rx='18' fill='%23f2e6ff'/><circle cx='48' cy='34' r='16' fill='url(%23g)'/><path d='M16 82c0-14 14-26 32-26s32 12 32 26' fill='url(%23g)'/><text x='50%' y='90%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='11' font-weight='700' fill='%23611db0'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
};

const geocodeAddress=async(address)=>{
  const url=`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(address)}`;
  const res=await fetch(url,{headers:{"Accept":"application/json"}});
  if(!res.ok) throw new Error("Geocoding service unavailable");
  const data=await res.json();
  if(!data.length) throw new Error("Location not found");
  return {lat:Number(data[0].lat),lng:Number(data[0].lon),label:data[0].display_name};
};

const ensureLeaflet=()=>typeof window.L!=="undefined";

const initMemberMap=()=>{
  const mapElement=document.getElementById("uk-map");
  if(!mapElement) return;
  const localPhotoByName={
    "jack arnold":"./Jack headshot.jpeg",
    "muhammad shipa":"./assets/Shipa picture.png",
    "anastasia madenidou":"./assets/Anastasia-Madenidou.webp"
  };

  const fallbackMembers=[
    {name:"Prof Caroline Gordon",role:"Founding and Clinical Leadership",hospital:"University Hospitals Birmingham",city:"Birmingham",lat:52.4862,lng:-1.8904,photo:""},
    {name:"Prof David Isenberg",role:"Senior Advisor",hospital:"University College London Hospital",city:"London",lat:51.5072,lng:-0.1276,photo:""},
    {name:"Prof Ed Vital",role:"BILAG Chair",hospital:"Leeds Teaching Hospitals",city:"Leeds",lat:53.8008,lng:-1.5491,photo:""},
    {name:"Dr Jane Hollis",role:"Trials Lead",hospital:"Manchester Royal Infirmary",city:"Manchester",lat:53.4808,lng:-2.2426,photo:""},
    {name:"Dr Alex Dunn",role:"Education Lead",hospital:"Royal Victoria Infirmary",city:"Newcastle",lat:54.9783,lng:-1.6178,photo:""},
    {name:"Dr Sarah Blake",role:"Biologics Register Team",hospital:"University Hospital Southampton",city:"Southampton",lat:50.9097,lng:-1.4044,photo:""},
    {name:"Dr Moira Kelly",role:"Clinical Network Member",hospital:"Queen Elizabeth University Hospital",city:"Glasgow",lat:55.8642,lng:-4.2518,photo:""},
    {name:"Dr Ciaran Byrne",role:"Collaborative Research Member",hospital:"Belfast City Hospital",city:"Belfast",lat:54.5973,lng:-5.9301,photo:""}
  ];

  const state={members:[...fallbackMembers],userLocation:null};
  const form=document.getElementById("expert-search-form");
  const addressInput=document.getElementById("search-address");
  const radiusSelect=document.getElementById("search-radius");
  const status=document.getElementById("search-status");
  const results=document.getElementById("expert-results");

  if(!ensureLeaflet()){
    status.textContent="Map library failed to load. Please refresh the page.";
    return;
  }

  const map=L.map(mapElement,{zoomControl:true,scrollWheelZoom:true});
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:18,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.fitBounds([[49.6,-8.8],[59.7,2.2]]);

  const markersLayer=L.layerGroup().addTo(map);
  let userMarker=null;

  const popupHtml=(m)=>{
    const avatar=m.photo||avatarData(m.name);
    const objectPos=/jack arnold/i.test(m.name)?"50% 16%":"center";
    return `<div style="display:grid;grid-template-columns:40px 1fr;gap:.5rem;align-items:center;min-width:210px"><img src="${avatar}" alt="${m.name} avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:${objectPos};border:2px solid #e6d4ff"><div><strong>${m.name}</strong><br><span>${m.hospital}</span><br><span style="color:#65557f">${m.city}</span></div></div>`;
  };

  const renderMap=(nearbyIds=new Set())=>{
    markersLayer.clearLayers();
    state.members.forEach((m,idx)=>{
      const color=nearbyIds.has(idx)?"#dd5f1a":"#7e2ec5";
      const marker=L.circleMarker([m.lat,m.lng],{
        radius:7,
        color:"#ffffff",
        weight:2,
        fillColor:color,
        fillOpacity:1
      }).bindPopup(popupHtml(m)).bindTooltip(`${m.name} - ${m.hospital}`,{direction:"top"});
      marker.on("mouseover",()=>marker.openPopup());
      marker.on("mouseout",()=>marker.closePopup());
      marker.addTo(markersLayer);
    });

    if(userMarker){
      map.removeLayer(userMarker);
      userMarker=null;
    }
    if(state.userLocation){
      userMarker=L.circleMarker([state.userLocation.lat,state.userLocation.lng],{
        radius:7,
        color:"#ffffff",
        weight:2,
        fillColor:"#12a66a",
        fillOpacity:1
      }).bindTooltip("Your searched location",{direction:"top"}).addTo(map);
    }
  };

  const renderResults=(rows)=>{
    if(!rows.length){
      results.innerHTML="<p>No members found in this radius. Try increasing to 100 km or 150 km.</p>";
      return;
    }
    results.innerHTML="";
    rows.forEach((item)=>{
      const m=item.member;
      const card=document.createElement("article");
      card.className="expert-item";
      const img=document.createElement("img");
      img.className="expert-avatar";
      img.src=m.photo||avatarData(m.name);
      img.alt=`${m.name} profile`;
      if(/jack arnold/i.test(m.name)) img.style.objectPosition="50% 16%";
      img.loading="lazy";
      const copy=document.createElement("div");
      copy.innerHTML=`<h4>${m.name}</h4><p>Role: ${m.role}</p><p>Hospital: ${m.hospital}</p><p>Location: ${m.city}</p>`;
      if(typeof item.distance==="number"){
        const dist=document.createElement("span");
        dist.className="distance-pill";
        dist.textContent=`${item.distance.toFixed(1)} km away`;
        copy.appendChild(dist);
      }
      card.append(img,copy);
      results.appendChild(card);
    });
  };

  const showDefault=()=>{
    renderResults(state.members.map((member)=>({member})));
    renderMap();
  };

  const loadDefaultMembers=async()=>{
    const withHonorific=(name)=>{
      const n=(name||"").trim();
      if(!n) return "Dr BILAG Member";
      if(/^(dr|prof)\.?\s/i.test(n)) return n;
      return `Dr ${n}`;
    };

    try{
      const res=await fetch("./assets/bilag-members.json",{headers:{"Accept":"application/json"}});
      if(!res.ok) throw new Error("members file not found");
      const parsed=await res.json();
      if(!Array.isArray(parsed)) throw new Error("invalid members format");
      const clean=parsed.filter((p)=>
        p&&typeof p.name==="string"&&typeof p.hospital==="string"&&typeof p.city==="string"&&
        Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))
      ).map((p)=>({
        name:withHonorific(p.name),
        role:(()=>{const r=typeof p.role==="string"?p.role.trim():""; return (!r||/^bilag\s+member$/i.test(r))?"Member":r;})(),
        hospital:p.hospital.trim(),
        city:p.city.trim(),
        lat:Number(p.lat),
        lng:Number(p.lng),
        photo:(()=>{
          const explicit=typeof p.photo==="string"?p.photo.trim():"";
          if(explicit) return explicit;
          const key=(p.name||"").trim().toLowerCase();
          return localPhotoByName[key]||"";
        })()
      }));
      if(clean.length){
        state.members=clean;
        status.textContent=`Loaded ${clean.length} members from the BILAG directory.`;
      }
    }catch(_err){
      status.textContent="Using fallback sample members. Add assets/bilag-members.json for the full list.";
    }
    showDefault();
  };

  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const address=addressInput.value.trim();
    if(!address) return;
    status.textContent="Searching location and matching nearby members...";
    status.style.color="";
    try{
      const loc=await geocodeAddress(address);
      state.userLocation={lat:loc.lat,lng:loc.lng};
      const radius=Number(radiusSelect.value)||50;
      const nearby=state.members
        .map((member,idx)=>({member,idx,distance:distanceKm(state.userLocation,member)}))
        .filter((item)=>item.distance<=radius)
        .sort((a,b)=>a.distance-b.distance);
      renderResults(nearby);
      renderMap(new Set(nearby.map((n)=>n.idx)));
      status.textContent=`Showing ${nearby.length} member(s) within ${radius} km of ${loc.label}.`;
      map.flyTo([state.userLocation.lat,state.userLocation.lng],7,{duration:0.6});
    }catch(err){
      status.textContent=`Could not locate that address. Try a UK postcode or town. (${err.message})`;
      status.style.color="#b03a1b";
      renderMap();
    }
  });

  loadDefaultMembers();
};

const initTrialMap=()=>{
  const mapElement=document.getElementById("uk-trial-map");
  if(!mapElement) return;

  const trialSites=[
    {name:"FIRST Trial",phase:"Randomised controlled trial",status:"Recruiting",hospital:"Leeds Teaching Hospitals",city:"Leeds",lat:53.8008,lng:-1.5491,aim:"To evaluate first-line rituximab-based treatment pathways in active SLE.",criteria:"Adults with active SLE requiring systemic immunosuppressive escalation; standard safety screening required.",agents:"Rituximab-based regimen compared with current standard first-line escalation strategy.",logo:"./assets/university-of-leeds.png",logoAlt:"University of Leeds"},
    {name:"STRATIFY-LUPUS",phase:"Biomarker-stratified trial",status:"Recruiting",hospital:"University Hospitals Birmingham",city:"Birmingham",lat:52.4862,lng:-1.8904,aim:"To test biomarker-stratified treatment sequencing in moderate-to-severe lupus.",criteria:"Adults with serologically active SLE and disease features suitable for biologic treatment stratification.",agents:"Rituximab plus belimumab combination strategy versus biomarker-guided comparator arms."},
    {name:"Regional Lupus Trial Hub",phase:"Site preparation",status:"Opening soon",hospital:"Royal Victoria Infirmary",city:"Newcastle",lat:54.9783,lng:-1.6178,aim:"To expand regional recruitment into multicentre lupus interventional and translational studies.",criteria:"Adults with confirmed SLE suitable for screening into active BILAG-affiliated studies.",agents:"Agent selection aligned to currently active BILAG portfolio protocols at time of enrolment."},
    {name:"South Coast SLE Trial Unit",phase:"Early phase",status:"Recruiting",hospital:"University Hospital Southampton",city:"Southampton",lat:50.9097,lng:-1.4044,aim:"To evaluate early-phase therapeutic approaches for immune modulation in systemic lupus.",criteria:"Adults with active SLE meeting protocol laboratory, organ involvement, and treatment-history criteria.",agents:"Protocol-dependent investigational immune-modulating agents under early-phase governance."},
    {name:"Scottish Lupus Trial Node",phase:"Clinical studies",status:"Active",hospital:"Queen Elizabeth University Hospital",city:"Glasgow",lat:55.8642,lng:-4.2518,aim:"To support national trial access and harmonised disease activity measurement in Scottish centres.",criteria:"Patients with confirmed SLE eligible for active interventional or observational trial pathways.",agents:"Portfolio-dependent biologic and conventional immunosuppressive study regimens."},
    {name:"Northern Ireland Collaboration Site",phase:"Registry-linked studies",status:"Active",hospital:"Belfast City Hospital",city:"Belfast",lat:54.5973,lng:-5.9301,aim:"To integrate registry and trial workflows for improved regional lupus trial participation.",criteria:"Adults with SLE under specialist care with consent for registry linkage and protocol screening.",agents:"Registry-linked therapeutic cohorts including biologic and standard-care comparators."}
  ];

  const state={sites:trialSites,userLocation:null};
  const form=document.getElementById("trial-search-form");
  const addressInput=document.getElementById("trial-search-address");
  const radiusSelect=document.getElementById("trial-search-radius");
  const status=document.getElementById("trial-search-status");
  const results=document.getElementById("trial-results");
  const summaries=document.getElementById("trial-summaries");

  if(!ensureLeaflet()){
    status.textContent="Map library failed to load. Please refresh the page.";
    return;
  }

  const map=L.map(mapElement,{zoomControl:true,scrollWheelZoom:true});
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:18,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.fitBounds([[49.6,-8.8],[59.7,2.2]]);

  const markersLayer=L.layerGroup().addTo(map);
  let userMarker=null;

  const popupHtml=(site)=>`<div style="min-width:220px"><strong>${site.name}</strong><br><span>${site.hospital}</span><br><span style="color:#65557f">${site.city}</span><br><span style="color:#65557f">${site.status}</span></div>`;

  const renderMap=(nearbyIds=new Set())=>{
    markersLayer.clearLayers();
    state.sites.forEach((site,idx)=>{
      const color=nearbyIds.has(idx)?"#dd5f1a":"#7e2ec5";
      const marker=L.circleMarker([site.lat,site.lng],{
        radius:7,
        color:"#ffffff",
        weight:2,
        fillColor:color,
        fillOpacity:1
      }).bindPopup(popupHtml(site)).bindTooltip(`${site.name} - ${site.hospital}`,{direction:"top"});
      marker.on("mouseover",()=>marker.openPopup());
      marker.on("mouseout",()=>marker.closePopup());
      marker.addTo(markersLayer);
    });

    if(userMarker){
      map.removeLayer(userMarker);
      userMarker=null;
    }
    if(state.userLocation){
      userMarker=L.circleMarker([state.userLocation.lat,state.userLocation.lng],{
        radius:7,
        color:"#ffffff",
        weight:2,
        fillColor:"#12a66a",
        fillOpacity:1
      }).bindTooltip("Your searched location",{direction:"top"}).addTo(map);
    }
  };

  const renderResults=(rows)=>{
    if(!rows.length){
      results.innerHTML="<p>No trial sites found in this radius. Try increasing to 100 km or 150 km.</p>";
      return;
    }
    results.innerHTML="";
    rows.forEach((item)=>{
      const site=item.site;
      const card=document.createElement("article");
      card.className="expert-item";
      const img=document.createElement("img");
      img.className="expert-avatar";
      img.src=avatarData(site.name);
      img.alt=`${site.name} icon`;
      img.loading="lazy";
      const copy=document.createElement("div");
      const titleRow=`<h4 class="trial-title-row">${site.name}${site.logo?` <img src="${site.logo}" alt="${site.logoAlt||"Trial partner"} logo" class="trial-logo-mini">`:""}</h4>`;
      copy.innerHTML=`${titleRow}<p>Study type: ${site.phase}</p><p>Status: ${site.status}</p><p>Hospital: ${site.hospital}</p><p>Location: ${site.city}</p><p>Aim: ${site.aim}</p><p>Recruitment: ${site.criteria}</p><p>Agents: ${site.agents}</p>`;
      if(typeof item.distance==="number"){
        const dist=document.createElement("span");
        dist.className="distance-pill";
        dist.textContent=`${item.distance.toFixed(1)} km away`;
        copy.appendChild(dist);
      }
      card.append(img,copy);
      results.appendChild(card);
    });
  };

  const renderSummaries=()=>{
    if(!summaries) return;
    summaries.innerHTML="";
    state.sites.forEach((site)=>{
      const card=document.createElement("article");
      card.className="card trial-summary";
      const heading=`<h3 class="trial-title-row">${site.name}${site.logo?` <img src="${site.logo}" alt="${site.logoAlt||"Trial partner"} logo" class="trial-logo-mini">`:""}</h3>`;
      card.innerHTML=`${heading}<p><strong>Aim:</strong> ${site.aim}</p><p><strong>Recruitment criteria:</strong> ${site.criteria}</p><p><strong>Trial agents:</strong> ${site.agents}</p>`;
      summaries.appendChild(card);
    });
  };

  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const address=addressInput.value.trim();
    if(!address) return;
    status.textContent="Searching location and matching nearby trial sites...";
    status.style.color="";
    try{
      const loc=await geocodeAddress(address);
      state.userLocation={lat:loc.lat,lng:loc.lng};
      const radius=Number(radiusSelect.value)||50;
      const nearby=state.sites
        .map((site,idx)=>({site,idx,distance:distanceKm(state.userLocation,site)}))
        .filter((item)=>item.distance<=radius)
        .sort((a,b)=>a.distance-b.distance);
      renderResults(nearby);
      renderMap(new Set(nearby.map((n)=>n.idx)));
      status.textContent=`Showing ${nearby.length} trial site(s) within ${radius} km of ${loc.label}.`;
      map.flyTo([state.userLocation.lat,state.userLocation.lng],7,{duration:0.6});
    }catch(err){
      status.textContent=`Could not locate that address. Try a UK postcode or town. (${err.message})`;
      status.style.color="#b03a1b";
      renderMap();
    }
  });

  renderResults(state.sites.map((site)=>({site})));
  renderSummaries();
  renderMap();
};

initMemberMap();
initTrialMap();

const initNewsletterPage=()=>{
  const signupForm=document.getElementById("newsletter-signup-form");
  const adminPanel=document.getElementById("newsletter-admin-panel");
  const logoutBtn=document.getElementById("newsletter-admin-logout");
  const uploadInput=document.getElementById("newsletter-upload");
  const list=document.getElementById("newsletter-list");
  const status=document.getElementById("newsletter-signup-status");
  if(!signupForm||!status) return;

  const ADMIN_STORAGE_KEY="bilag_newsletter_admin";
  const ADMIN_ACCESS_CODE="BILAG-Admin-Upload";
  const urlParams=new URLSearchParams(window.location.search);
  let isAdmin=window.localStorage.getItem(ADMIN_STORAGE_KEY)==="1";

  if(urlParams.get("admin")==="1"&&!isAdmin){
    const entered=window.prompt("Admin access code");
    if(entered===ADMIN_ACCESS_CODE){
      isAdmin=true;
      window.localStorage.setItem(ADMIN_STORAGE_KEY,"1");
    }
  }

  if(adminPanel){
    adminPanel.style.display=isAdmin?"block":"none";
  }

  signupForm.addEventListener("submit",(e)=>{
    e.preventDefault();
    const nameField=document.getElementById("newsletter-name");
    const emailField=document.getElementById("newsletter-email");
    const fullName=nameField?nameField.value.trim():"";
    const email=emailField?emailField.value.trim():"";
    if(!fullName||!email){
      status.textContent="Please complete name and email to join the newsletter.";
      status.style.color="#b03a1b";
      return;
    }
    const subject=encodeURIComponent("BILAG Newsletter Signup");
    const body=encodeURIComponent(`Please add the following person to the BILAG newsletter list:\n\nName: ${fullName}\nEmail: ${email}`);
    window.location.href=`mailto:ContactBILAG@proton.me?subject=${subject}&body=${body}`;
    status.textContent="Opening your email app to complete signup.";
    status.style.color="";
    signupForm.reset();
  });

  if(!isAdmin||!uploadInput||!list) return;

  uploadInput.addEventListener("change",()=>{
    const files=Array.from(uploadInput.files||[]);
    if(!files.length) return;
    const empty=list.querySelector(".meta-text");
    if(empty) empty.remove();
    files.forEach((file)=>{
      const item=document.createElement("li");
      const link=document.createElement("a");
      link.href=URL.createObjectURL(file);
      link.textContent=file.name;
      link.target="_blank";
      link.rel="noopener noreferrer";
      link.download=file.name;
      item.appendChild(link);
      list.appendChild(item);
    });
    uploadInput.value="";
  });

  if(logoutBtn){
    logoutBtn.addEventListener("click",()=>{
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
      window.location.href="./newsletter.html";
    });
  }
};

initNewsletterPage();

const publicationList=document.getElementById("publication-list");
if(publicationList){
  const publications=[{
    url:"https://academic.oup.com/rheumatology/article/61/10/4006/6514547?login=false",
    title:"Rheumatology (Oxford Academic): BILAG-related publication",
    image:"https://image.thum.io/get/width/420/crop/240/noanimate/https://academic.oup.com/rheumatology/article/61/10/4006/6514547?login=false"
  }];

  const toDomain=(url)=>{
    try{return new URL(url).hostname.replace(/^www\./,"");}
    catch{return "Publication source";}
  };
  const fallbackThumb=(url)=>`https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;

  const render=()=>{
    if(!publications.length){
      publicationList.innerHTML="<p>No publications loaded yet.</p>";
      return;
    }
    publicationList.innerHTML="";
    publications.forEach((pub)=>{
      const card=document.createElement("article");
      card.className="publication-item";
      const img=document.createElement("img");
      img.className="publication-thumb";
      img.src=pub.image || `https://image.thum.io/get/width/420/crop/240/noanimate/${pub.url}`;
      img.alt=`Preview for ${pub.title || pub.url}`;
      img.loading="lazy";
      img.onerror=()=>{img.onerror=null;img.src=fallbackThumb(pub.url);};
      const copy=document.createElement("div");
      const h=document.createElement("h4");
      h.textContent=pub.title || toDomain(pub.url);
      const src=document.createElement("p");
      src.textContent=toDomain(pub.url);
      const a=document.createElement("a");
      a.className="publication-link";
      a.href=pub.url;
      a.target="_blank";
      a.rel="noopener noreferrer";
      a.textContent=pub.url;
      copy.append(h,src,a);
      card.append(img,copy);
      publicationList.appendChild(card);
    });
  };

  render();
}
