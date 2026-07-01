/* ============================================================
   bigdata-prep — moteur commun (tabs / flashcards / QCM)
   Chaque page module définit : window.FLASHCARDS et window.QCM
   ============================================================ */

/* ---------------- TABS ---------------- */
function initTabs(){
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
}

/* ---------------- FLASHCARDS ---------------- */
function initFlashcards(data){
  if(!data || !data.length) return;
  let order = data.map((_,i)=>i);
  let idx = 0;

  const stage   = document.getElementById('fc-stage');
  const countEl = document.getElementById('fc-count');
  const progEl  = document.getElementById('fc-progress');

  function render(){
    const item = data[order[idx]];
    stage.innerHTML = `
      <div class="flashcard" id="fc-card">
        <div class="flashcard-inner">
          <div class="fc-face front">
            <span class="chip ${item.tag||''}">${(item.tagLabel||item.tag||'').toUpperCase()}</span>
            <p>${item.q}</p>
            <span class="fc-hint">cliquer pour retourner</span>
          </div>
          <div class="fc-face back">
            <p>${item.a}</p>
          </div>
        </div>
      </div>`;
    countEl.textContent = `${idx+1} / ${order.length}`;
    progEl.textContent = `Carte ${idx+1} sur ${order.length}`;
    document.getElementById('fc-card').addEventListener('click', e=>{
      e.currentTarget.classList.toggle('flipped');
    });
  }

  document.getElementById('fc-prev').addEventListener('click', ()=>{
    idx = (idx-1+order.length)%order.length; render();
  });
  document.getElementById('fc-next').addEventListener('click', ()=>{
    idx = (idx+1)%order.length; render();
  });
  document.getElementById('fc-shuffle').addEventListener('click', ()=>{
    for(let i=order.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [order[i],order[j]]=[order[j],order[i]];
    }
    idx = 0; render();
  });

  render();
}

/* ---------------- QCM amélioré ---------------- */
function initQCM(data, accentVar){
  if(!data || !data.length) return;
  let idx = 0;
  let score = 0;
  let answered = false;
  let selected = new Set();

  const head   = document.getElementById('qcm-root');
  const accent = accentVar || 'var(--hadoop)';

  function letters(n){ return 'ABCDEFGH'.slice(0,n).split(''); }

  function renderQuestion(){
    answered = false;
    selected = new Set();
    const q = data[idx];
    const isMulti = q.type === 'multi';
    const isTF = q.type === 'tf';
    const kindLabel = isTF ? 'Vrai / Faux' : (isMulti ? 'QCM — plusieurs réponses possibles' : 'QCM — une seule réponse');

    let optsHtml = '';
    if(isTF){
      optsHtml = `<div class="qcm-opts tf-row">` + q.opts.map((o,i)=>`
        <button class="qcm-opt tf" data-i="${i}">
          <span class="mark"></span>${o}
        </button>`).join('') + `</div>`;
    } else {
      optsHtml = `<div class="qcm-opts">` + q.opts.map((o,i)=>`
        <button class="qcm-opt" data-i="${i}">
          <span class="mark">${letters(q.opts.length)[i]}</span>${o}
        </button>`).join('') + `</div>`;
    }

    head.innerHTML = `
      <div class="qcm-head">
        <div class="qcm-meter">
          <div class="qcm-bar"><div class="qcm-bar-fill" style="width:${(idx/data.length)*100}%;background:${accent}"></div></div>
          <div class="qcm-meter-label"><span>Question ${idx+1} / ${data.length}</span><span>Score : ${score}/${idx}</span></div>
        </div>
        <div class="qcm-score-pill">⚡ ${score} pts</div>
      </div>
      <div class="qcm-card">
        <div class="qcm-kind">${kindLabel} · ${q.points||1} pt${(q.points||1)>1?'s':''}</div>
        <p class="qcm-q">${q.q}</p>
        ${optsHtml}
        ${isMulti ? `<div style="margin-top:16px;"><button class="fc-btn" id="qcm-validate">Valider la réponse</button></div>` : ''}
        <div class="qcm-explain" id="qcm-explain"></div>
        <div class="qcm-foot">
          <span style="font-family:var(--mono);font-size:12px;color:var(--text-faint);">${q.theme||''}</span>
          <button class="qcm-next" id="qcm-next">Question suivante →</button>
        </div>
      </div>`;

    const opts = head.querySelectorAll('.qcm-opt');
    opts.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(answered) return;
        const i = parseInt(btn.dataset.i);
        if(isMulti){
          btn.classList.toggle('muted-select');
          if(selected.has(i)) selected.delete(i); else selected.add(i);
          btn.style.borderColor = selected.has(i) ? accent : 'var(--line)';
        } else {
          selected = new Set([i]);
          resolve();
        }
      });
    });

    if(isMulti){
      document.getElementById('qcm-validate').addEventListener('click', ()=>{
        if(selected.size===0) return;
        resolve();
      });
    }

    document.getElementById('qcm-next').addEventListener('click', ()=>{
      idx++;
      if(idx >= data.length){ renderResult(); } else { renderQuestion(); }
    });
  }

  function resolve(){
    answered = true;
    const q = data[idx];
    const correctSet = new Set(q.correct);
    const opts = head.querySelectorAll('.qcm-opt');
    let isExactlyCorrect = correctSet.size === selected.size && [...correctSet].every(v=>selected.has(v));

    opts.forEach((btn,i)=>{
      btn.classList.add('disabled');
      if(correctSet.has(i)) btn.classList.add('correct');
      else if(selected.has(i)) btn.classList.add('wrong');
    });

    if(isExactlyCorrect) score += (q.points||1);

    const explainBox = document.getElementById('qcm-explain');
    explainBox.classList.add('show');
    explainBox.innerHTML = `<b>${isExactlyCorrect ? '✓ Correct.' : '✕ Pas tout à fait.'}</b> ${q.explain||''}`;

    document.getElementById('qcm-next').classList.add('show');
    head.querySelector('.qcm-meter-label').innerHTML =
      `<span>Question ${idx+1} / ${data.length}</span><span>Score : ${score}/${idx+1}</span>`;
    head.querySelector('.qcm-score-pill').textContent = `⚡ ${score} pts`;
  }

  function renderResult(){
    const total = data.reduce((s,q)=>s+(q.points||1),0);
    const pct = Math.round((score/total)*100);
    let msg = "Encore un peu de révision et ce sera dans la poche.";
    if(pct>=90) msg = "Excellent — niveau examen atteint.";
    else if(pct>=70) msg = "Solide. Quelques points à consolider.";
    else if(pct>=50) msg = "Les bases sont là, il faut creuser certains points.";

    head.innerHTML = `
      <div class="qcm-card qcm-result">
        <div class="ring" style="border-color:${accent};color:${accent}">${pct}%</div>
        <h3>${score} / ${total} points</h3>
        <p>${msg}</p>
        <button class="fc-btn" id="qcm-restart" style="margin:0 auto;">↺ Recommencer la série</button>
      </div>`;
    document.getElementById('qcm-restart').addEventListener('click', ()=>{
      idx = 0; score = 0; renderQuestion();
    });
  }

  renderQuestion();
}

document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  if(window.FLASHCARDS) initFlashcards(window.FLASHCARDS);
  if(window.QCM) initQCM(window.QCM, window.QCM_ACCENT);
});
