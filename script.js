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
  const normalizePersonName=(name)=>(
    (name||"")
      .toLowerCase()
      .replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i,"")
      .replace(/\s+/g," ")
      .trim()
  );
  const localPhotoByName={
    "jack arnold":"./Jack headshot.jpeg",
    "muhammad shipa":"./assets/Shipa picture.png",
    "anastasia madenidou":"./assets/Anastasia-Madenidou.webp"
  };

  const fallbackMembers=[
    {name:"Prof Caroline Gordon",role:"Founding and Clinical Leadership",hospital:"University Hospitals Birmingham",city:"Birmingham",lat:52.4862,lng:-1.8904,photo:""},
    {name:"Prof David Isenberg",role:"Senior Advisor",hospital:"University College London Hospital",city:"London",lat:51.5072,lng:-0.1276,photo:""},
    {name:"Professor Edward Vital",role:"BILAG Chair",hospital:"Leeds Teaching Hospitals",city:"Leeds",lat:53.8008,lng:-1.5491,photo:""},
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

  const buildMemberSites=()=>{
    const grouped=new Map();
    state.members.forEach((member,idx)=>{
      const cityKey=(member.city||"").trim().toLowerCase();
      const key=cityKey||`${member.lat.toFixed(3)}|${member.lng.toFixed(3)}`;
      if(!grouped.has(key)){
        grouped.set(key,{
          city:member.city,
          lat:member.lat,
          lng:member.lng,
          members:[],
          hospitals:new Set()
        });
      }
      const site=grouped.get(key);
      site.members.push({...member,idx});
      site.hospitals.add(member.hospital);
    });
    return Array.from(grouped.values()).map((site)=>{
      const count=site.members.length||1;
      const lat=site.members.reduce((sum,m)=>sum+m.lat,0)/count;
      const lng=site.members.reduce((sum,m)=>sum+m.lng,0)/count;
      return {...site,lat,lng,hospitals:Array.from(site.hospitals)};
    });
  };

  const popupHtml=(site)=>{
    const rank=(name)=>{
      if(/^(prof|professor)\.?\s/i.test(name)) return 0;
      if(/^dr\.?\s/i.test(name)) return 1;
      return 2;
    };
    const list=[...site.members]
      .sort((a,b)=>{
        const r=rank(a.name)-rank(b.name);
        if(r!==0) return r;
        return a.name.localeCompare(b.name,undefined,{sensitivity:"base"});
      })
      .map((m)=>`<li>${m.name}</li>`)
      .join("");
    const hospitals=site.hospitals.join("; ");
    return `<div style="min-width:240px"><strong>${site.city}</strong><br><span style="color:#65557f">${hospitals}</span><br><span style="color:#65557f">${site.members.length} BILAG member(s)</span><ul style="margin:.4rem 0 0;padding-left:1rem;max-height:120px;overflow:auto">${list}</ul></div>`;
  };

  const renderMap=(nearbyIds=new Set())=>{
    markersLayer.clearLayers();
    buildMemberSites().forEach((site)=>{
      const isNearby=site.members.some((m)=>nearbyIds.has(m.idx));
      const color=isNearby?"#dd5f1a":"#7e2ec5";
      const marker=L.circleMarker([site.lat,site.lng],{
        radius:7,
        color:"#ffffff",
        weight:2,
        fillColor:color,
        fillOpacity:1
      }).bindPopup(popupHtml(site)).bindTooltip(`${site.city} (${site.members.length})`,{direction:"top"});
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
      if(/^(dr|prof|mr|ms|mrs)\.?\s/i.test(n)) return n;
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
          const key=normalizePersonName(p.name);
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

  const activeTrials=[
    {name:"FIRST Trial",phase:"Randomised controlled trial",status:"Recruiting",hospital:"Leeds Teaching Hospitals",city:"Leeds",lat:53.8008,lng:-1.5491,aim:"To evaluate first-line rituximab-based treatment pathways in active SLE.",criteria:"Adults with active SLE requiring systemic immunosuppressive escalation; standard safety screening required.",agents:"Rituximab-based regimen compared with current standard first-line escalation strategy.",logo:"./assets/university-of-leeds.png",logoAlt:"University of Leeds",institutionLabel:"Coordinating institution",institutionName:"University of Leeds",locationLabel:"Coordinating centre"},
    {name:"STRATIFY-LUPUS",phase:"Biomarker-stratified trial",status:"Recruiting",hospital:"University College London Hospital",city:"London",lat:51.5072,lng:-0.1276,aim:"To test biomarker-stratified treatment sequencing in moderate-to-severe lupus.",criteria:"Adults with serologically active SLE and disease features suitable for biologic treatment stratification.",agents:"Rituximab plus belimumab combination strategy versus biomarker-guided comparator arms.",logo:"./assets/UCL Logo.png",logoAlt:"UCL",institutionLabel:"Coordinating institution",institutionName:"University College London",locationLabel:"Coordinating centre"}
  ];

  const regionalHubs=[
    {name:"Regional Lupus Trial Hub",phase:"Site preparation",status:"Opening soon",hospital:"Royal Victoria Infirmary",city:"Newcastle",lat:54.9783,lng:-1.6178,aim:"To expand regional recruitment into multicentre lupus interventional and translational studies.",criteria:"Adults with confirmed SLE suitable for screening into active BILAG-affiliated studies.",agents:"Agent selection aligned to currently active BILAG portfolio protocols at time of enrolment."},
    {name:"South Coast SLE Trial Unit",phase:"Early phase",status:"Recruiting",hospital:"University Hospital Southampton",city:"Southampton",lat:50.9097,lng:-1.4044,aim:"To evaluate early-phase therapeutic approaches for immune modulation in systemic lupus.",criteria:"Adults with active SLE meeting protocol laboratory, organ involvement, and treatment-history criteria.",agents:"Protocol-dependent investigational immune-modulating agents under early-phase governance."},
    {name:"Scottish Lupus Trial Node",phase:"Clinical studies",status:"Active",hospital:"Queen Elizabeth University Hospital",city:"Glasgow",lat:55.8642,lng:-4.2518,aim:"To support national trial access and harmonised disease activity measurement in Scottish centres.",criteria:"Patients with confirmed SLE eligible for active interventional or observational trial pathways.",agents:"Portfolio-dependent biologic and conventional immunosuppressive study regimens."},
    {name:"Northern Ireland Collaboration Site",phase:"Registry-linked studies",status:"Active",hospital:"Belfast City Hospital",city:"Belfast",lat:54.5973,lng:-5.9301,aim:"To integrate registry and trial workflows for improved regional lupus trial participation.",criteria:"Adults with SLE under specialist care with consent for registry linkage and protocol screening.",agents:"Registry-linked therapeutic cohorts including biologic and standard-care comparators."}
  ];

  const state={activeTrials,regionalHubs,referralCentres:[],userLocation:null};
  const form=document.getElementById("trial-search-form");
  const addressInput=document.getElementById("trial-search-address");
  const radiusSelect=document.getElementById("trial-search-radius");
  const status=document.getElementById("trial-search-status");
  const results=document.getElementById("trial-results");
  const summaries=document.getElementById("trial-summaries");
  const hubs=document.getElementById("trial-regional-hubs");

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
  const categoryColor={
    coordinating:"#7e2ec5",
    hub:"#9d63dd",
    referral:"#5f179f"
  };
  const siteKey=(site)=>`${site.hospital}|${site.city}`;

  const popupHtml=(site)=>{
    const labels=[];
    if(site.categories.has("coordinating")) labels.push("Coordinating trial site");
    if(site.categories.has("hub")) labels.push("Regional trial hub");
    if(site.categories.has("referral")) labels.push("Active referral centre");
    const trials=site.trials.length
      ?`<div style="margin:.35rem 0 0"><strong>Available trials</strong><ul style="margin:.2rem 0 0;padding-left:1rem">${site.trials.map((t)=>`<li>${t}</li>`).join("")}</ul></div>`
      :"";
    const sortedNames=[...(site.memberNames||[])].sort((a,b)=>{
      const aProf=/^(prof|professor)\.?\s/i.test(a);
      const bProf=/^(prof|professor)\.?\s/i.test(b);
      if(aProf!==bProf) return aProf?-1:1;
      return a.localeCompare(b,undefined,{sensitivity:"base"});
    });
    const membersList=sortedNames.length
      ?sortedNames.map((n)=>`<li>${n}</li>`).join("")
      :"<li>No members listed for this point</li>";
    const members=`<div style="margin:.35rem 0 0"><strong>Members</strong><ul style="margin:.2rem 0 0;padding-left:1rem;max-height:120px;overflow:auto">${membersList}</ul></div><span style="color:#65557f">Active members: ${site.memberCount??0}</span>`;
    return `<div style="min-width:250px"><strong>${site.hospital}</strong><br><span style="color:#65557f">${site.city}</span><br><span style="color:#65557f">${labels.join(" | ")}</span>${trials}${members}</div>`;
  };

  const buildMapPoints=()=>{
    const grouped=new Map();
    const cityMembers=new Map();
    state.referralCentres.forEach((site)=>{
      const key=(site.city||"").toLowerCase();
      const prev=cityMembers.get(key)||new Set();
      (site.memberNames||[]).forEach((n)=>prev.add(n));
      cityMembers.set(key,prev);
    });
    const ensure=(hospital,city,lat,lng)=>{
      const key=`${hospital}|${city}`;
      if(!grouped.has(key)){
        grouped.set(key,{
          key,
          hospital,
          city,
          lat,
          lng,
          categories:new Set(),
          trials:[],
          memberCount:0,
          memberNames:new Set()
        });
      }
      return grouped.get(key);
    };

    state.referralCentres.forEach((site)=>{
      const item=ensure(site.hospital,site.city,site.lat,site.lng);
      item.categories.add("referral");
      item.memberCount=site.memberCount||item.memberCount||0;
      (site.memberNames||[]).forEach((n)=>item.memberNames.add(n));
    });
    state.activeTrials.forEach((site)=>{
      const item=ensure(site.hospital,site.city,site.lat,site.lng);
      item.categories.add("coordinating");
      item.trials.push(site.name);
      item.memberCount=Math.max(item.memberCount||0,site.memberCount||0);
    });
    state.regionalHubs.forEach((site)=>{
      const item=ensure(site.hospital,site.city,site.lat,site.lng);
      item.categories.add("hub");
      item.trials.push(site.name);
      item.memberCount=Math.max(item.memberCount||0,site.memberCount||0);
    });
    return Array.from(grouped.values()).map((site)=>{
      if(!site.memberNames.size){
        const cityKey=(site.city||"").toLowerCase();
        const citySet=cityMembers.get(cityKey);
        if(citySet) citySet.forEach((n)=>site.memberNames.add(n));
      }
      return {...site,memberNames:Array.from(site.memberNames).sort()};
    });
  };

  const renderMap=(nearbyKeys=new Set())=>{
    markersLayer.clearLayers();
    buildMapPoints().forEach((site)=>{
      const baseColor=site.categories.has("coordinating")
        ?categoryColor.coordinating
        :site.categories.has("hub")
          ?categoryColor.hub
          :categoryColor.referral;
      const isNearby=nearbyKeys.has(site.key);
      const marker=L.circleMarker([site.lat,site.lng],{
        radius:7,
        color:isNearby?"#dd5f1a":"#ffffff",
        weight:isNearby?3:2,
        fillColor:baseColor,
        fillOpacity:1
      }).bindPopup(popupHtml(site)).bindTooltip(`${site.hospital} (${site.city})`,{direction:"top"});
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
      results.innerHTML="<p>No referral centres found in this radius. Try increasing to 100 km or 150 km.</p>";
      return;
    }
    results.innerHTML="";
    rows.forEach((item)=>{
      const site=item.site;
      const card=document.createElement("article");
      card.className="expert-item";
      const img=document.createElement("img");
      img.className="expert-avatar";
      img.src=avatarData(site.hospital);
      img.alt=`${site.hospital} icon`;
      img.loading="lazy";
      const copy=document.createElement("div");
      copy.innerHTML=`<h4>${site.hospital}</h4><p>City: ${site.city}</p><p>BILAG members at centre: ${site.memberCount||0}</p><p>Status: Active clinical trial and referral centre</p>`;
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
    state.activeTrials.forEach((site)=>{
      const card=document.createElement("article");
      card.className="card trial-summary";
      const summaryLogo=(site.logo)
        ?`<img src="${site.logo}" alt="${site.logoAlt||"Trial partner"} logo" class="trial-logo-mini">`
        :"";
      card.innerHTML=`<h3 class="trial-title-row">${site.name}${summaryLogo?` ${summaryLogo}`:""}</h3><p><strong>Active members:</strong> ${site.memberCount??0}</p><p><strong>Aim:</strong> ${site.aim}</p><p><strong>Recruitment criteria:</strong> ${site.criteria}</p><p><strong>Trial agents:</strong> ${site.agents}</p>`;
      summaries.appendChild(card);
    });
  };

  const renderRegionalHubs=()=>{
    if(!hubs) return;
    hubs.innerHTML="";
    state.regionalHubs.forEach((site)=>{
      const card=document.createElement("article");
      card.className="card trial-summary";
      card.innerHTML=`<h3>${site.name}</h3><p><strong>Study type:</strong> ${site.phase}</p><p><strong>Status:</strong> ${site.status}</p><p><strong>Hospital:</strong> ${site.hospital}</p><p><strong>Location:</strong> ${site.city}</p><p><strong>Active members:</strong> ${site.memberCount??0}</p><p><strong>Aim:</strong> ${site.aim}</p><p><strong>Recruitment:</strong> ${site.criteria}</p><p><strong>Agents:</strong> ${site.agents}</p>`;
      hubs.appendChild(card);
    });
  };

  const applySiteMemberCounts=()=>{
    const byHospitalCity=new Map(
      state.referralCentres.map((c)=>[`${c.hospital}|${c.city}`,c.memberCount||0])
    );
    const byCity=new Map();
    state.referralCentres.forEach((c)=>{
      byCity.set(c.city,(byCity.get(c.city)||0)+(c.memberCount||0));
    });
    const resolveCount=(site)=>byHospitalCity.get(`${site.hospital}|${site.city}`)??byCity.get(site.city)??0;
    state.activeTrials=state.activeTrials.map((site)=>({...site,memberCount:resolveCount(site)}));
    state.regionalHubs=state.regionalHubs.map((site)=>({...site,memberCount:resolveCount(site)}));
  };

  const buildReferralCentres=async()=>{
    const fallback=Array.from(new Map(
      state.activeTrials.concat(state.regionalHubs).map((s)=>[
        `${s.hospital}|${s.city}`,
        {hospital:s.hospital,city:s.city,lat:s.lat,lng:s.lng,memberCount:0,memberNames:[]}
      ])
    ).values());
    try{
      const res=await fetch("./assets/bilag-members.json",{headers:{"Accept":"application/json"}});
      if(!res.ok) throw new Error("members file not found");
      const members=await res.json();
      if(!Array.isArray(members)) throw new Error("invalid members format");
      const grouped=new Map();
      members.forEach((m)=>{
        if(!m||typeof m.hospital!=="string"||typeof m.city!=="string") return;
        const hospital=m.hospital.trim();
        const city=m.city.trim();
        const lat=Number(m.lat);
        const lng=Number(m.lng);
        if(!hospital||!city||!Number.isFinite(lat)||!Number.isFinite(lng)) return;
        const key=`${hospital}|${city}`;
        const prev=grouped.get(key)||{hospital,city,latSum:0,lngSum:0,count:0,names:new Set()};
        prev.latSum+=lat;
        prev.lngSum+=lng;
        prev.count+=1;
        if(typeof m.name==="string"&&m.name.trim()) prev.names.add(m.name.trim());
        grouped.set(key,prev);
      });
      return Array.from(grouped.values())
        .map((r)=>({
          hospital:r.hospital,
          city:r.city,
          lat:r.latSum/r.count,
          lng:r.lngSum/r.count,
          memberCount:r.count,
          memberNames:Array.from(r.names).sort()
        }))
        .sort((a,b)=>a.hospital.localeCompare(b.hospital));
    }catch(_err){
      return fallback;
    }
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
      const nearby=state.referralCentres
        .map((site,idx)=>({site,idx,distance:distanceKm(state.userLocation,site)}))
        .filter((item)=>item.distance<=radius)
        .sort((a,b)=>a.distance-b.distance);
      renderResults(nearby);
      renderMap(new Set(nearby.map((n)=>siteKey(n.site))));
      status.textContent=`Showing ${nearby.length} referral centre(s) within ${radius} km of ${loc.label}.`;
      map.flyTo([state.userLocation.lat,state.userLocation.lng],7,{duration:0.6});
    }catch(err){
      status.textContent=`Could not locate that address. Try a UK postcode or town. (${err.message})`;
      status.style.color="#b03a1b";
      renderMap();
    }
  });

  const init=async()=>{
    state.referralCentres=await buildReferralCentres();
    applySiteMemberCounts();
    renderResults(state.referralCentres.map((site)=>({site})));
    renderSummaries();
    renderRegionalHubs();
    renderMap();
  };
  init();
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
  const publications=[
    {url:"https://pubmed.ncbi.nlm.nih.gov/15814577/",title:"PubMed PMID: 15814577"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/35686924/",title:"PubMed PMID: 35686924"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/26589244/",title:"PubMed PMID: 26589244"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/38251591/",title:"PubMed PMID: 38251591"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/36874268/",title:"PubMed PMID: 36874268"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/34698499/",title:"PubMed PMID: 34698499"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/17519277/",title:"PubMed PMID: 17519277"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/37225418/",title:"PubMed PMID: 37225418"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/35266512/",title:"PubMed PMID: 35266512"},
    {url:"https://pubmed.ncbi.nlm.nih.gov/34301852/",title:"PubMed PMID: 34301852"}
  ];

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
