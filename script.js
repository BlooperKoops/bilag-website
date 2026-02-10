const btn=document.querySelector(".menu-toggle");
const nav=document.querySelector(".nav-list");
if(btn&&nav){
  btn.addEventListener("click",()=>{const open=nav.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));});
  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");btn.setAttribute("aria-expanded","false");}));
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
        const btn=item.querySelector(".dropdown-toggle");
        if(btn) btn.setAttribute("aria-expanded","false");
      }
    });
    parent.classList.toggle("open",willOpen);
    toggle.setAttribute("aria-expanded",String(willOpen));
  });
});

const mapElement=document.getElementById("uk-map");
if(mapElement){
  const state={
    members:[
      {name:"Prof Caroline Gordon",role:"Founding and Clinical Leadership",hospital:"University Hospitals Birmingham",city:"Birmingham",lat:52.4862,lng:-1.8904,photo:""},
      {name:"Prof David Isenberg",role:"Senior Advisor",hospital:"University College London Hospital",city:"London",lat:51.5072,lng:-0.1276,photo:""},
      {name:"Prof Ed Vital",role:"BILAG Chair",hospital:"Leeds Teaching Hospitals",city:"Leeds",lat:53.8008,lng:-1.5491,photo:""},
      {name:"Dr Jane Hollis",role:"Trials Lead",hospital:"Manchester Royal Infirmary",city:"Manchester",lat:53.4808,lng:-2.2426,photo:""},
      {name:"Dr Alex Dunn",role:"Education Lead",hospital:"Royal Victoria Infirmary",city:"Newcastle",lat:54.9783,lng:-1.6178,photo:""},
      {name:"Dr Sarah Blake",role:"Biologics Register Team",hospital:"University Hospital Southampton",city:"Southampton",lat:50.9097,lng:-1.4044,photo:""},
      {name:"Dr Moira Kelly",role:"Clinical Network Member",hospital:"Queen Elizabeth University Hospital",city:"Glasgow",lat:55.8642,lng:-4.2518,photo:""},
      {name:"Dr Ciaran Byrne",role:"Collaborative Research Member",hospital:"Belfast City Hospital",city:"Belfast",lat:54.5973,lng:-5.9301,photo:""}
    ],
    userLocation:null
  };

  const BOUNDS={minLat:49.8,maxLat:59.6,minLng:-8.8,maxLng:2.2};
  const form=document.getElementById("expert-search-form");
  const addressInput=document.getElementById("search-address");
  const radiusSelect=document.getElementById("search-radius");
  const status=document.getElementById("search-status");
  const results=document.getElementById("expert-results");
  const markers=document.getElementById("map-markers");
  const hoverCard=document.getElementById("map-hover-card");
  const fileInput=document.getElementById("member-file");

  const toRad=(d)=>d*Math.PI/180;
  const distanceKm=(a,b)=>{
    const R=6371;
    const dLat=toRad(b.lat-a.lat);
    const dLng=toRad(b.lng-a.lng);
    const aa=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(aa));
  };
  const initials=(name)=>name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
  const avatarData=(name)=>{
    const label=initials(name)||"BL";
    const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%238e47d6'/><stop offset='100%' stop-color='%235f179f'/></linearGradient></defs><rect width='96' height='96' fill='url(%23g)'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='32' font-weight='700' fill='white'>${label}</text></svg>`;
    return `data:image/svg+xml;utf8,${svg}`;
  };

  const coordToPct=(lat,lng)=>{
    const x=((lng-BOUNDS.minLng)/(BOUNDS.maxLng-BOUNDS.minLng))*100;
    const y=(1-((lat-BOUNDS.minLat)/(BOUNDS.maxLat-BOUNDS.minLat)))*100;
    return {x:Math.min(96,Math.max(4,x)),y:Math.min(96,Math.max(4,y))};
  };

  const renderMap=(nearbyIds=new Set())=>{
    markers.innerHTML="";
    const hideHover=()=>{
      if(!hoverCard) return;
      hoverCard.classList.remove("visible");
    };
    const showHover=(member,pct)=>{
      if(!hoverCard) return;
      const avatar=member.photo||avatarData(member.name);
      hoverCard.innerHTML=`<img src="${avatar}" alt="${member.name} avatar" /><div><h4>${member.name}</h4><p>${member.hospital}</p></div>`;
      hoverCard.classList.add("visible");
      const left=Math.min(73,Math.max(3,pct.x+2.2));
      const top=Math.min(88,Math.max(4,pct.y-10));
      hoverCard.style.left=`${left}%`;
      hoverCard.style.top=`${top}%`;
    };

    state.members.forEach((m,idx)=>{
      const pt=coordToPct(m.lat,m.lng);
      const pin=document.createElement("button");
      pin.type="button";
      pin.className=`map-pin ${nearbyIds.has(idx)?"nearby":""}`;
      pin.style.left=`${pt.x}%`;
      pin.style.top=`${pt.y}%`;
      pin.title=`${m.name} - ${m.hospital}`;
      pin.setAttribute("aria-label",pin.title);
      pin.addEventListener("mouseenter",()=>showHover(m,pt));
      pin.addEventListener("mouseleave",hideHover);
      pin.addEventListener("focus",()=>showHover(m,pt));
      pin.addEventListener("blur",hideHover);
      markers.appendChild(pin);
    });
    markers.addEventListener("mouseleave",hideHover,{once:true});
    if(state.userLocation){
      const userPt=coordToPct(state.userLocation.lat,state.userLocation.lng);
      const userPin=document.createElement("div");
      userPin.className="map-pin user";
      userPin.style.left=`${userPt.x}%`;
      userPin.style.top=`${userPt.y}%`;
      userPin.title="Your searched location";
      markers.appendChild(userPin);
    }
  };

  const renderResults=(rows)=>{
    if(!rows.length){
      results.innerHTML="<p>No experts found in this radius. Try increasing to 100 km or 150 km.</p>";
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
      img.loading="lazy";
      const copy=document.createElement("div");
      const title=document.createElement("h4");
      title.textContent=m.name;
      const role=document.createElement("p");
      role.textContent=`Role in BILAG: ${m.role}`;
      const hosp=document.createElement("p");
      hosp.textContent=`Hospital: ${m.hospital}`;
      const city=document.createElement("p");
      city.textContent=`Location: ${m.city}`;
      copy.append(title,role,hosp,city);
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

  const geocodeAddress=async(address)=>{
    const url=`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(address)}`;
    const res=await fetch(url,{headers:{"Accept":"application/json"}});
    if(!res.ok) throw new Error("Geocoding service unavailable");
    const data=await res.json();
    if(!data.length) throw new Error("Location not found");
    return {lat:Number(data[0].lat),lng:Number(data[0].lon),label:data[0].display_name};
  };

  const showDefault=()=>{
    renderResults(state.members.map(m=>({member:m})));
    renderMap();
  };

  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const address=addressInput.value.trim();
    if(!address) return;
    status.textContent="Searching location and matching nearby experts...";
    status.style.color="";
    try{
      const loc=await geocodeAddress(address);
      state.userLocation={lat:loc.lat,lng:loc.lng};
      const radius=Number(radiusSelect.value)||50;
      const nearby=state.members
        .map((member,idx)=>({member,idx,distance:distanceKm(state.userLocation,member)}))
        .filter(item=>item.distance<=radius)
        .sort((a,b)=>a.distance-b.distance);
      renderResults(nearby);
      renderMap(new Set(nearby.map(n=>n.idx)));
      status.textContent=`Showing ${nearby.length} expert(s) within ${radius} km of ${loc.label}.`;
    }catch(err){
      status.textContent=`Could not locate that address. Try a UK postcode or town. (${err.message})`;
      status.style.color="#b03a1b";
      renderMap();
    }
  });

  fileInput.addEventListener("change",async(e)=>{
    const file=e.target.files&&e.target.files[0];
    if(!file) return;
    try{
      const text=await file.text();
      const parsed=JSON.parse(text);
      if(!Array.isArray(parsed)) throw new Error("JSON must be an array");
      const clean=parsed.filter(p=>
        p&&typeof p.name==="string"&&typeof p.role==="string"&&typeof p.hospital==="string"&&
        typeof p.city==="string"&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))
      ).map(p=>({
        name:p.name.trim(),role:p.role.trim(),hospital:p.hospital.trim(),city:p.city.trim(),
        lat:Number(p.lat),lng:Number(p.lng),photo:typeof p.photo==="string"?p.photo.trim():""
      }));
      if(!clean.length) throw new Error("No valid member records");
      state.members=clean;
      state.userLocation=null;
      showDefault();
      status.textContent=`Loaded ${clean.length} member locations from ${file.name}.`;
    }catch(err){
      status.textContent=`Upload failed: ${err.message}`;
      status.style.color="#b03a1b";
    }
  });

  showDefault();
}

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
