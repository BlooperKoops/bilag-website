const btn=document.querySelector(".menu-toggle");
const nav=document.querySelector(".nav-list");
if(btn&&nav){
  const closeDropdowns=()=>{
    document.querySelectorAll(".nav-dropdown.open").forEach((item)=>{
      item.classList.remove("open");
      const itemBtn=item.querySelector(".dropdown-toggle");
      if(itemBtn) itemBtn.setAttribute("aria-expanded","false");
    });
  };
  const closeMenu=()=>{
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded","false");
    closeDropdowns();
  };

  btn.addEventListener("click",()=>{
    const open=nav.classList.toggle("open");
    btn.setAttribute("aria-expanded",String(open));
    if(!open) closeDropdowns();
  });
  nav.querySelectorAll("a").forEach((a)=>a.addEventListener("click",closeMenu));

  document.addEventListener("click",(e)=>{
    if(!nav.contains(e.target)&&e.target!==btn&&!btn.contains(e.target)){
      closeMenu();
    }
  });
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

document.addEventListener("keydown",(e)=>{
  if(e.key!=="Escape") return;
  document.querySelectorAll(".nav-dropdown.open").forEach((item)=>{
    item.classList.remove("open");
    const itemBtn=item.querySelector(".dropdown-toggle");
    if(itemBtn) itemBtn.setAttribute("aria-expanded","false");
  });
  if(nav&&nav.classList.contains("open")){
    nav.classList.remove("open");
    if(btn) btn.setAttribute("aria-expanded","false");
  }
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

const getBrowserLocation=()=>new Promise((resolve,reject)=>{
  if(!("geolocation" in navigator)){reject(new Error("Location is not supported by this browser"));return;}
  navigator.geolocation.getCurrentPosition(
    (pos)=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude,label:"your current location"}),
    (err)=>reject(new Error(err.code===1?"Location access was declined":"Could not determine your location")),
    {enableHighAccuracy:false,timeout:10000,maximumAge:300000}
  );
});

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
    "jack arnold":"./assets/jack-arnold.jpeg",
    "david d'cruz":"https://www.kcl.ac.uk/newimages/person-profile/2022b/david-dcruz.jpeg.xcaf109aa.jpg?w=160&h=172&crop=160,160,0,6&f=webp",
    "sarah skeoch":"https://ruh.nhs.uk/RNHRD/zz_images/rheumatology/Sarah_Skeoch.jpg",
    "elizabeth ball":"https://www.doctify.com/public/images/athena-uk/practice/logo/ms-elisabeth-ball/ms-elisabeth-ballcbdf90a0-2f3b-42c3-b279-945732220034.png",
    "arvind kaul":"https://s3-eu-west-1.amazonaws.com/bupa-images-4b24291849b400303aea648fcd38a718/86033/d3990ad2-7a88-4590-baf1-2a4438ac6c49.png",
    "muhammad shipa":"./assets/Shipa picture.png",
    "anastasia madenidou":"./assets/Anastasia-Madenidou.webp",
    "edward vital":"./assets/edward vital.jpg",
    "ian bruce":"./assets/Ian-Bruce-600x600.png",
    "michael beresford":"./assets/800_professor_mw_beresford.jpg",
    "lucy carter":"./assets/lucy carter.jpeg",
    "shirish dubey":"./assets/Dr-Shirish-Dubey-Consultant Rheumatologist.jpg",
    "sarah dyball":"./assets/sarah dyball.jpeg",
    "christopher edwards":"./assets/Chris_Edwards.jpg_SIA_JPG_fit_to_width_INLINE.jpg",
    "caroline gordon":"./assets/gordon-caroline.jpg",
    "mohini gray":"./assets/mohini gray.jpeg",
    "david isenberg":"./assets/isenberg.jpg",
    "peter lanyon":"./assets/peter lanyon.jpeg",
    "zoe mclaren":"./assets/Zoe McLaren.jpg",
    "ben parker":"./assets/Professor-Ben-Parker_Consultant-Rheumatologist-at-MFT-scaled-500x700.jpg",
    "athiveeraramapandian prabu":"./assets/Prabu.jpeg",
    "anisur rahman":"./assets/rahman.jpg",
    "john a. reynolds":"./assets/john reynolds.jpg",
    "mia rodziewicz":"./assets/mia roziewicz.jpg",
    "eve smith":"./assets/eve smith.png",
    "teh lee-suan teh":"./assets/Lee-Suan-Teh1-1.jpg",
    "chris wincup":"./assets/Dr_Chris_Wincup.png",
    "md yuzaiful md yusof":"./assets/yuz yusof.jpg",
    "antony psarras":"./assets/Antony.Psarras.webp",
    "bridget griffiths":"./assets/Bridget griffiths.jpeg",
    "michael ehrenstein":"./assets/mike-ehrenstein.png"
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

  const memberMarkerColor="#1f77b4";
  const nearbyMarkerColor="#e15759";
  const userLocationColor="#0ea5e9";

  const renderMap=(nearbyIds=new Set())=>{
    markersLayer.clearLayers();
    buildMemberSites().forEach((site)=>{
      const isNearby=site.members.some((m)=>nearbyIds.has(m.idx));
      const color=isNearby?nearbyMarkerColor:memberMarkerColor;
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
        fillColor:userLocationColor,
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
      img.className=`expert-avatar${m.photo?" expert-avatar-photo":""}`;
      img.src=m.photo||avatarData(m.name);
      img.alt=`${m.name} profile`;
      if(m.photo) img.style.objectPosition="50% 20%";
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
      if(/^(dr|prof|professor|mr|ms|mrs)\.?\s/i.test(n)) return n;
      return `Dr ${n}`;
    };

    try{
      const res=await fetch("./assets/bilag-members.json?v=20260929",{headers:{"Accept":"application/json"},cache:"no-store"});
      if(!res.ok) throw new Error("members file not found");
      const parsed=await res.json();
      if(!Array.isArray(parsed)) throw new Error("invalid members format");
      const clean=parsed.filter((p)=>
        p&&typeof p.name==="string"&&typeof p.hospital==="string"&&typeof p.city==="string"&&
        Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))
      ).map((p)=>({
        name:withHonorific(p.name),
        role:(()=>{
          const key=normalizePersonName(p.name);
          if(key==="edward vital") return "BILAG Chair";
          const r=typeof p.role==="string"?p.role.trim():"";
          return (!r||/^bilag\s+member$/i.test(r))?"Member":r;
        })(),
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

  const runMemberSearch=async(locate)=>{
    status.textContent="Searching location and matching nearby members...";
    status.style.color="";
    try{
      const loc=await locate();
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
      status.textContent=`Could not find that location. Try a UK postcode or town. (${err.message})`;
      status.style.color="#b03a1b";
      renderMap();
    }
  };
  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const address=addressInput.value.trim();
    if(!address) return;
    runMemberSearch(()=>geocodeAddress(address));
  });
  const locateBtn=document.getElementById("locate-me");
  if(locateBtn){
    locateBtn.addEventListener("click",()=>{
      addressInput.value="";
      runMemberSearch(getBrowserLocation);
    });
  }

  loadDefaultMembers();
};

const initTrialMap=()=>{
  const mapElement=document.getElementById("uk-trial-map");
  if(!mapElement) return;

  const activeTrials=[
    {name:"FIRST Trial",phase:"Randomised controlled trial",status:"Recruiting",hospital:"Leeds Teaching Hospitals",city:"Leeds",lat:53.8008,lng:-1.5491,aim:"To evaluate first-line rituximab-based treatment pathways in active SLE.",criteria:"Adults with active SLE requiring systemic immunosuppressive escalation; standard safety screening required.",agents:"Rituximab-based regimen compared with current standard first-line escalation strategy.",logo:"./assets/university-of-leeds.png",logoAlt:"University of Leeds",institutionLabel:"Coordinating institution",institutionName:"University of Leeds",locationLabel:"Coordinating centre"},
    {name:"STRATIFY-LUPUS",phase:"Biomarker-stratified trial",status:"Recruiting",hospital:"University College London Hospital",city:"London",lat:51.5072,lng:-0.1276,aim:"To evaluate whether a serum biomarker can identify patients with SLE most likely to benefit from belimumab following B cell depletion therapy (rituximab).",criteria:"Adults with moderate-to-severe SLE and planned rituximab (the biomarker assay will be performed at UCL but will not delay rituximab treatment).",agents:"Rituximab followed by belimumab versus rituximab followed by placebo.",logo:"./assets/UCL Logo.png",logoAlt:"UCL",trialLogo:"./assets/stratify-lupus-logo.png",trialLogoAlt:"STRATIFY lupus",institutionLabel:"Coordinating institution",institutionName:"University College London",locationLabel:"Coordinating centre"}
  ];

  const regionalHubs=[
    {name:"Newcastle Trial Hub",phase:"Site preparation",status:"Opening soon",hospital:"Freeman Hospital",city:"Newcastle upon Tyne",lat:55.00257,lng:-1.59318,aim:"To expand regional recruitment into multicentre lupus interventional and translational studies.",criteria:"Adults with confirmed SLE suitable for screening into active BILAG-affiliated studies.",agents:"Agent selection aligned to currently active BILAG portfolio protocols at time of enrolment."},
    {name:"South Coast SLE Trial Unit",phase:"Early phase",status:"Recruiting",hospital:"University Hospital Southampton",city:"Southampton",lat:50.9097,lng:-1.4044,aim:"To evaluate early-phase therapeutic approaches for immune modulation in systemic lupus.",criteria:"Adults with active SLE meeting protocol laboratory, organ involvement, and treatment-history criteria.",agents:"Protocol-dependent investigational immune-modulating agents under early-phase governance."},
    {name:"Scottish Lupus Trial Node",phase:"Clinical studies",status:"Active",hospital:"Queen Elizabeth University Hospital",city:"Glasgow",lat:55.8642,lng:-4.2518,aim:"To support national trial access and harmonised disease activity measurement in Scottish centres.",criteria:"Patients with confirmed SLE eligible for active interventional or observational trial pathways.",agents:"Portfolio-dependent biologic and conventional immunosuppressive study regimens."},
    {name:"Northern Ireland Collaboration Site",phase:"Registry-linked studies",status:"Active",hospital:"Belfast City Hospital",city:"Belfast",lat:54.5973,lng:-5.9301,aim:"To integrate registry and trial workflows for improved regional lupus trial participation.",criteria:"Adults with SLE under specialist care with consent for registry linkage and protocol screening.",agents:"Registry-linked therapeutic cohorts including biologic and standard-care comparators."}
  ];

  const state={activeTrials,regionalHubs,referralCentres:[],userLocation:null};
  const defaultTrustLogo="./assets/NHS Logo.png";
  const hospitalLogoMap={
    "Leeds Teaching Hospitals":"./assets/university-of-leeds.png",
    "University College London Hospital":"./assets/UCL Logo.png",
    "University College London":"./assets/UCL Logo.png",
    "Manchester University Hospitals":"./assets/Manchester Logo.png",
    "University of Manchester":"./assets/Manchester Logo.png",
    "University of Leeds":"./assets/university-of-leeds.png",
    "University of Birmingham":"./assets/university-of-birmingham-logo-png_seeklogo-410943.webp",
    "University Hospitals Birmingham":"./assets/university-of-birmingham-logo-png_seeklogo-410943.webp",
    "Sandwell and West Birmingham Hospitals":"./assets/university-of-birmingham-logo-png_seeklogo-410943.webp",
    "University of Glasgow":"./assets/university-of-glasgow-logo-png_seeklogo-145972.webp",
    "University of Edinburgh":"./assets/university-of-edinburgh-logo-png_seeklogo-322161.webp",
    "University of Sheffield":"./assets/university-of-sheffield-logo-png_seeklogo-456623.webp",
    "University of Oxford":"./assets/university-of-oxford-logo-0.webp",
    "Oxford University Hospitals":"./assets/university-of-oxford-logo-0.webp",
    "University of Bath":"./assets/university-of-bath-logo.webp",
    "University of Liverpool":"./assets/university-of-liverpool-logo.webp",
    "University of Southampton":"./assets/university-of-southampton-logo.webp",
    "University Hospital Southampton":"./assets/university-of-southampton-logo.webp",
    "Guy's and St Thomas' Hospital":"./assets/kings-college-london7355.logowik.com.webp",
    "Nottingham University Hospitals":"./assets/the-university-of-nottingham-1-logo-png-transparent.png",
    "St George's University Hospitals":"./assets/kings-college-london7355.logowik.com.webp",
    "Queen's University Belfast":"./assets/queens-university-belfast-logo-570x570.webp",
    "Belfast City Hospital":"./assets/queens-university-belfast-logo-570x570.webp",
    "King's College London":"./assets/kings-college-london7355.logowik.com.webp",
    "Newcastle Upon Tyne Hospitals":"./assets/newcastle-university-logo.webp",
    "Royal Victoria Infirmary":"./assets/newcastle-university-logo.webp",
    "Freeman Hospital":"./assets/newcastle-university-logo.webp"
  };
  const logoMatchers=[
    {match:/leeds/i,logo:"./assets/university-of-leeds.png"},
    {match:/university college london|ucl/i,logo:"./assets/UCL Logo.png"},
    {match:/manchester/i,logo:"./assets/Manchester Logo.png"},
    {match:/newcastle|royal victoria infirmary|freeman hospital/i,logo:"./assets/newcastle-university-logo.webp"},
    {match:/birmingham|sandwell/i,logo:"./assets/university-of-birmingham-logo-png_seeklogo-410943.webp"},
    {match:/glasgow|queen elizabeth university hospital/i,logo:"./assets/university-of-glasgow-logo-png_seeklogo-145972.webp"},
    {match:/edinburgh/i,logo:"./assets/university-of-edinburgh-logo-png_seeklogo-322161.webp"},
    {match:/sheffield/i,logo:"./assets/university-of-sheffield-logo-png_seeklogo-456623.webp"},
    {match:/oxford/i,logo:"./assets/university-of-oxford-logo-0.webp"},
    {match:/bath/i,logo:"./assets/university-of-bath-logo.webp"},
    {match:/liverpool/i,logo:"./assets/university-of-liverpool-logo.webp"},
    {match:/southampton/i,logo:"./assets/university-of-southampton-logo.webp"},
    {match:/guy'?s and st thomas|guy'?s|st thomas/i,logo:"./assets/kings-college-london7355.logowik.com.webp"},
    {match:/st george'?s/i,logo:"./assets/kings-college-london7355.logowik.com.webp"},
    {match:/nottingham/i,logo:"./assets/the-university-of-nottingham-1-logo-png-transparent.png"},
    {match:/belfast|queen'?s university/i,logo:"./assets/queens-university-belfast-logo-570x570.webp"},
    {match:/king'?s college london/i,logo:"./assets/kings-college-london7355.logowik.com.webp"}
  ];
  const matchedLogo=(hospital)=>{
    const hit=logoMatchers.find((item)=>item.match.test(hospital||""));
    return hit?hit.logo:null;
  };
  const siteLogo=(site)=>site.logo||hospitalLogoMap[site.hospital]||matchedLogo(site.hospital)||defaultTrustLogo;
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
  const categoryColor={
    coordinating:"#1f77b4",
    hub:"#e15759",
    referral:"#59a14f"
  };
  const nearbyOutlineColor="#1f1f1f";
  const userLocationColor="#0ea5e9";
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
        color:isNearby?nearbyOutlineColor:"#ffffff",
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
        fillColor:userLocationColor,
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
      img.className="expert-avatar expert-avatar-logo";
      img.src=siteLogo(site);
      img.alt=`${site.hospital} logo`;
      img.loading="lazy";
      img.onerror=()=>{
        img.onerror=null;
        img.className="expert-avatar";
        img.src=avatarData(site.hospital);
        img.alt=`${site.hospital} icon`;
      };
      const copy=document.createElement("div");
      copy.innerHTML=`<h4>${site.hospital}</h4><p>City: ${site.city}</p><p>BILAG members: ${site.memberCount||0}</p><p>Status: Active clinical trial and referral centre</p>`;
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
      const trialLogo=(site.trialLogo)
        ?`<img src="${site.trialLogo}" alt="${site.trialLogoAlt||site.name} logo" class="trial-logo-mini">`
        :"";
      const summaryLogo=(site.logo)
        ?`<img src="${site.logo}" alt="${site.logoAlt||"Trial partner"} logo" class="trial-logo-mini">`
        :"";
      const logos=`${trialLogo}${summaryLogo}`;
      card.innerHTML=`<h3 class="trial-title-row">${site.name}${logos?` ${logos}`:""}</h3><p><strong>Active members:</strong> ${site.memberCount??0}</p><p><strong>Aim:</strong> ${site.aim}</p><p><strong>Recruitment criteria:</strong> ${site.criteria}</p><p><strong>Trial treatment:</strong> ${site.agents}</p>`;
      summaries.appendChild(card);
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
      const res=await fetch("./assets/bilag-members.json?v=20260929",{headers:{"Accept":"application/json"},cache:"no-store"});
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

  const runTrialSearch=async(locate)=>{
    status.textContent="Searching location and matching nearby trial sites...";
    status.style.color="";
    try{
      const loc=await locate();
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
      status.textContent=`Could not find that location. Try a UK postcode or town. (${err.message})`;
      status.style.color="#b03a1b";
      renderMap();
    }
  };
  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const address=addressInput.value.trim();
    if(!address) return;
    runTrialSearch(()=>geocodeAddress(address));
  });
  const locateBtn=document.getElementById("trial-locate-me");
  if(locateBtn){
    locateBtn.addEventListener("click",()=>{
      addressInput.value="";
      runTrialSearch(getBrowserLocation);
    });
  }

  const init=async()=>{
    state.referralCentres=await buildReferralCentres();
    applySiteMemberCounts();
    renderResults(state.referralCentres.map((site)=>({site})));
    renderSummaries();
    renderMap();
  };
  init();
};

initMemberMap();
initTrialMap();


const publicationList=document.getElementById("publication-list");
if(publicationList){
  const publications=[
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/15814577/",
      title:"BILAG 2004. Development and initial validation of an updated version of the British Isles Lupus Assessment Group's disease activity index for patients with systemic lupus erythematosus",
      authors:"D A Isenberg et al.",
      journal:"Rheumatology (Oxford)",
      date:"2005 Jul"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/35686924/",
      title:"The BILAG-2004 index is associated with development of new damage in SLE",
      authors:"Chee-Seng Yee et al.",
      journal:"Rheumatology (Oxford)",
      date:"2023 Feb"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/26589244/",
      title:"From BILAG to BILAG-based combined lupus assessment-30 years on",
      authors:"Claire-Louise Murphy et al.",
      journal:"Rheumatology (Oxford)",
      date:"2016 Aug"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/38251591/",
      title:"Early infection risk in patients with systemic lupus erythematosus treated with rituximab or belimumab from the British Isles Lupus Assessment Group Biologics Register (BILAG-BR): a prospective longitudinal study",
      authors:"Mia Rodziewicz et al.",
      journal:"Lancet Rheumatology",
      date:"2023 May"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/36874268/",
      title:"How can we accurately measure disease activity during pregnancy in systemic lupus erythematosus? New insights from the BILAG-2004 Pregnancy Index",
      authors:"Sasha Ali et al.",
      journal:"Rheumatology Advances in Practice",
      date:"2023 Feb"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/34698499/",
      title:"Effectiveness of Belimumab After Rituximab in Systemic Lupus Erythematosus: A Randomized Controlled Trial",
      authors:"Muhammad Shipa et al.",
      journal:"Annals of Internal Medicine",
      date:"2021 Dec"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/17519277/",
      title:"BILAG-2004 index captures systemic lupus erythematosus disease activity better than SLEDAI-2000",
      authors:"C-S Yee et al.",
      journal:"Annals of the Rheumatic Diseases",
      date:"2008 Jun"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/37225418/",
      title:"Revision to the musculoskeletal domain of the BILAG-2004 index to incorporate ultrasound findings",
      authors:"Robert D Sandler et al.",
      journal:"Rheumatology (Oxford)",
      date:"2024 Feb"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/35266512/",
      title:"Efficacy and safety of obinutuzumab in systemic lupus erythematosus patients with secondary non-response to rituximab",
      authors:"Jack Arnold et al.",
      journal:"Rheumatology (Oxford)",
      date:"2022 Nov"
    },
    {
      url:"https://pubmed.ncbi.nlm.nih.gov/34301852/",
      title:"Lupus clinical trial eligibility in a real-world setting: results from the British Isles Lupus Assessment Group-Biologics Register (BILAG-BR)",
      authors:"Sarah Dyball et al.",
      journal:"Lupus Science & Medicine",
      date:"2021 Jul"
    }
  ];

  const toDomain=(url)=>{
    try{return new URL(url).hostname.replace(/^www\./,"");}
    catch{return "Publication source";}
  };
  const pmidFromUrl=(url)=>{
    const match=(url||"").match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
    return match?match[1]:"PubMed";
  };

  const render=()=>{
    if(!publications.length){
      publicationList.innerHTML="<p>No publications loaded yet.</p>";
      return;
    }
    const monthMap={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const parsePubDate=(value)=>{
      if(!value) return new Date(0);
      const parts=String(value).trim().split(/\s+/);
      const year=Number(parts[0]);
      const monthKey=(parts[1]||"jan").slice(0,3).toLowerCase();
      const month=Number.isFinite(monthMap[monthKey])?monthMap[monthKey]:0;
      if(!Number.isFinite(year)||year<1800) return new Date(0);
      return new Date(year,month,1);
    };
    const ordered=[...publications].sort((a,b)=>parsePubDate(b.date)-parsePubDate(a.date));
    publicationList.innerHTML="";
    ordered.forEach((pub)=>{
      const card=document.createElement("article");
      card.className="publication-item";
      const meta=document.createElement("div");
      meta.className="publication-meta";
      const year=String(pub.date||"").trim().split(/\s+/)[0];
      if(year){
        const y=document.createElement("span");
        y.className="publication-year";
        y.textContent=year;
        meta.appendChild(y);
      }
      if(pub.journal){
        const j=document.createElement("span");
        j.className="publication-journal";
        j.textContent=pub.journal;
        meta.appendChild(j);
      }
      const h=document.createElement("h4");
      h.textContent=pub.title || toDomain(pub.url);
      const author=document.createElement("p");
      author.className="publication-authors";
      author.textContent=pub.authors || "Author details on PubMed";
      const a=document.createElement("a");
      a.className="publication-link";
      a.href=pub.url;
      a.target="_blank";
      a.rel="noopener noreferrer";
      const pmid=pmidFromUrl(pub.url);
      a.textContent=pmid==="PubMed"?`View on ${toDomain(pub.url)} \u2192`:`View on PubMed (PMID ${pmid}) \u2192`;
      card.append(meta,h,author,a);
      publicationList.appendChild(card);
    });
  };

  render();
}
