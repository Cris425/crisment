(function(){
  'use strict';
  var D = window.JANE_DATA;
  var STORAGE_KEY = 'protocolo-jane-app-v1';
  var XP_LARGA = 20, XP_RAPIDA = 10;

  var state = { checks:{}, sessionDates:{}, dismissedInstall:false, exerciseAnswers:{} };
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var loaded = JSON.parse(raw);
      state.checks = loaded.checks || {};
      state.sessionDates = loaded.sessionDates || {};
      state.dismissedInstall = !!loaded.dismissedInstall;
      state.exerciseAnswers = loaded.exerciseAnswers || {};
    }
  } catch(e){}

  function save(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){}
  }

  function todayStr(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function computeStreak(){
    var days = {};
    Object.keys(state.sessionDates).forEach(function(id){ days[state.sessionDates[id]] = true; });
    var streak = 0;
    var d = new Date();
    for (var i = 0; i < 365; i++) {
      var y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      var key = y + '-' + m + '-' + day;
      if (days[key]) { streak++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); continue; }
      else break;
    }
    return streak;
  }

  function computeXP(){
    var xp = 0;
    D.levels.forEach(function(lvl){
      lvl.sessions.forEach(function(s){
        if (state.checks[s.id]) xp += (s.tag === 'Larga' ? XP_LARGA : XP_RAPIDA);
      });
    });
    return xp;
  }

  function allSessionsFlat(){
    var out = [];
    D.levels.forEach(function(lvl, li){
      lvl.sessions.forEach(function(s){ out.push({ session:s, level:lvl, levelIndex:li }); });
    });
    return out;
  }

  function totalSessions(){ return allSessionsFlat().length; }
  function doneCount(){
    var n = 0;
    allSessionsFlat().forEach(function(x){ if (state.checks[x.session.id]) n++; });
    return n;
  }
  function nextUndone(){
    var flat = allSessionsFlat();
    for (var i=0;i<flat.length;i++){ if (!state.checks[flat[i].session.id]) return flat[i]; }
    return null;
  }

  // ---------- Icons per node state ----------
  function nodeIcon(state_){
    if (state_ === 'done') return '✓';
    if (state_ === 'next') return '▶';
    return '';
  }

  // ---------- Tabs ----------
  var TAB_IDS = ['camino','progreso','memoria','guia'];
  function showTab(id){
    TAB_IDS.forEach(function(t){
      document.getElementById('screen-'+t).classList.toggle('active', t===id);
      document.getElementById('tab-'+t).classList.toggle('active', t===id);
    });
    window.scrollTo(0,0);
  }

  // ---------- Rendering: Camino (home) ----------
  var LEVEL_COLORS = {
    'Percepción':'var(--cat-percepcion)',
    'Comunicación':'var(--cat-comunicacion)',
    'Influencia':'var(--cat-influencia)',
    'Integración — nivel nuevo':'var(--cat-integracion)'
  };
  function levelColor(lvl){ return LEVEL_COLORS[lvl.cat] || 'var(--cat-integracion)'; }

  function renderHome(){
    var done = doneCount(), total = totalSessions();
    var pct = total ? Math.round(done/total*100) : 0;
    var nxt = nextUndone();

    var heroHtml = '';
    heroHtml += '<div class="home-hero">';
    heroHtml += '<div class="eyebrow">Protocolo Jane</div>';
    heroHtml += '<h2>' + (nxt ? 'Sigue tu camino' : '¡Programa completo!') + '</h2>';
    heroHtml += '<p>' + (nxt
      ? ('Llevas ' + done + ' de ' + total + ' sesiones. ' + (nxt.session.tag === 'Larga' ? 'La siguiente pide un bloque dedicado.' : 'La siguiente es corta, cabe en un hueco.'))
      : 'Has completado las 52 sesiones. Revisa la fase de maestría en Guía.') + '</p>';
    heroHtml += '<div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div>';
    if (nxt) {
      heroHtml += '<button class="cta-btn" id="heroCta"><span>Continuar · ' + nxt.session.label + '</span><span class="arrow">→</span></button>';
    }
    heroHtml += '</div>';

    var pathHtml = '<div class="path-wrap">';
    var aligns = ['align-l','align-c','align-r'];
    D.levels.forEach(function(lvl, li){
      var lvlDone = lvl.sessions.filter(function(s){ return state.checks[s.id]; }).length;
      var lvlPct = Math.round(lvlDone/lvl.sessions.length*100);
      pathHtml += '<div class="unit-head" id="unit-'+li+'">';
      pathHtml += '<div class="unit-badge" style="background:'+levelColor(lvl)+'">'+lvl.num+'</div>';
      pathHtml += '<div class="unit-titles"><div class="unit-cat">'+esc(lvl.cat)+'</div><div class="unit-name">'+esc(lvl.name)+'</div></div>';
      pathHtml += '<div class="unit-pct">'+lvlDone+'/'+lvl.sessions.length+'</div>';
      pathHtml += '</div>';

      if (lvl.sources && lvl.sources.length) {
        pathHtml += '<div class="unit-sources">' + lvl.sources.map(function(s){ return '<span class="src-chip">'+s+'</span>'; }).join('') + '</div>';
      }

      var foundNext = false;
      lvl.sessions.forEach(function(s, si){
        var isDone = !!state.checks[s.id];
        var isNext = (!isDone && !foundNext && nxt && nxt.session.id === s.id);
        if (!isDone && nxt && nxt.session.id === s.id) foundNext = true;
        var cls = isDone ? 'done' : (isNext ? 'next' : 'todo');
        var align = aligns[si % 3];
        pathHtml += '<div class="path-row '+align+'">';
        pathHtml += '<div class="node-wrap">';
        pathHtml += '<button class="node '+cls+'" data-session="'+s.id+'" aria-label="'+esc(s.label)+'">';
        pathHtml += isDone ? '<span class="node-ico">✓</span>' : (isNext ? '<span class="node-ico">▶</span>' : '<span class="node-num">'+ (si+1) +'</span>');
        pathHtml += '</button>';
        pathHtml += '<div class="node-tag">'+(s.tag==='Larga'?'Larga':'Rápida')+'</div>';
        pathHtml += '</div>';
        pathHtml += '</div>';
        if (si < lvl.sessions.length-1) pathHtml += '<div class="path-row align-c"><div class="node-connector'+(isDone?' done':'')+'"></div></div>';
      });

      if (lvl.checklist && lvl.checklist.length) {
        pathHtml += '<div class="unit-check"><div class="unit-check-title">Checklist de nivel</div>';
        lvl.checklist.forEach(function(c){ pathHtml += '<div class="unit-check-item"><span class="dot"></span>'+esc(c)+'</div>'; });
        pathHtml += '</div>';
      }
      if (lvl.milestone) {
        pathHtml += '<div class="unit-milestone"><strong>Hito de paso de nivel</strong>'+esc(lvl.milestone)+'</div>';
      }
      if (lvl.simcards && lvl.simcards.length) {
        pathHtml += '<button class="unit-sim-btn" data-simlevel="'+li+'">🎭 Simulación con Claude · '+esc(lvl.simcards[0].title)+'</button>';
      }
    });
    pathHtml += '</div>';

    document.getElementById('homeHero').innerHTML = heroHtml;
    document.getElementById('homePath').innerHTML = pathHtml;

    var cta = document.getElementById('heroCta');
    if (cta) cta.addEventListener('click', function(){ if (nxt) openLesson(nxt.session.id); });
    document.querySelectorAll('.node').forEach(function(btn){
      btn.addEventListener('click', function(){ openLesson(btn.getAttribute('data-session')); });
    });
    document.querySelectorAll('.unit-sim-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var li = parseInt(btn.getAttribute('data-simlevel'),10);
        openSimStandalone(D.levels[li]);
      });
    });
  }

  function esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ---------- Rendering: Progreso ----------
  function renderProgreso(){
    var done = doneCount(), total = totalSessions();
    var pct = total ? Math.round(done/total*100) : 0;
    var html = '';
    html += '<div class="stat-grid">';
    html += statTile('Racha', computeStreak(), 'días');
    html += statTile('Progreso', pct, '%');
    html += statTile('Sesiones', done+'/'+total, '');
    html += statTile('XP total', computeXP(), 'xp');
    html += '</div>';

    html += '<div class="card"><h3>Distribución de las 52 sesiones por nivel</h3>';
    html += '<div class="timeline-bar" id="tlBar"></div>';
    html += '<div class="legend">';
    var seen = {};
    D.levels.forEach(function(lvl){
      var key = lvl.cat;
      if (seen[key]) return; seen[key]=true;
      html += '<div class="legend-item"><span class="legend-chip" style="background:'+levelColor(lvl)+'"></span>'+esc(lvl.cat)+'</div>';
    });
    html += '</div></div>';

    html += '<div class="card"><h3>El filtro de la objetividad</h3><p style="margin-bottom:8px;">Vuelve aquí cuando dudes si una observación es válida o solo un juicio.</p>';
    html += '<table class="mini-table"><thead><tr><th>Subjetivo</th><th>Hecho objetivo</th><th>Deducción válida</th></tr></thead><tbody>';
    D.objTable.forEach(function(row){
      html += '<tr><td class="fail">'+esc(row[0])+'</td><td>'+esc(row[1])+'</td><td>'+esc(row[2])+'</td></tr>';
    });
    html += '</tbody></table></div>';

    document.getElementById('screen-progreso').innerHTML = '<h2 class="section-title" style="margin-top:6px;">Tu progreso</h2>' + html;

    var bar = document.getElementById('tlBar');
    var totalS = D.levels.reduce(function(a,l){return a+l.sessions.length;},0);
    D.levels.forEach(function(lvl){
      var seg = document.createElement('div');
      seg.className = 'tl-seg';
      seg.style.width = (lvl.sessions.length/totalS*100)+'%';
      seg.style.background = levelColor(lvl);
      seg.title = lvl.name + ' — ' + lvl.sessions.length + ' sesiones';
      seg.textContent = lvl.sessions.length >= 6 ? ('N'+parseInt(lvl.num,10)) : '';
      bar.appendChild(seg);
    });
  }
  function statTile(label, value, unit){
    return '<div class="stat-tile"><div class="stat-label">'+esc(label)+'</div><div class="stat-value">'+esc(value)+'<span class="unit">'+esc(unit)+'</span></div></div>';
  }

  // ---------- Rendering: Memoria ----------
  function renderMemoria(){
    var doneSessionNums = {};
    allSessionsFlat().forEach(function(x, idx){ if (state.checks[x.session.id]) doneSessionNums[idx+1] = true; });
    // figure out max completed session number in order
    var flat = allSessionsFlat();
    var maxDoneIdx = -1;
    flat.forEach(function(x, idx){ if (state.checks[x.session.id]) maxDoneIdx = Math.max(maxDoneIdx, idx); });
    var maxDoneNum = maxDoneIdx + 1;

    var html = '<h2 class="section-title" style="margin-top:6px;">Palacio de la Memoria</h2>';
    D.memoria.lede.forEach(function(p){ html += '<p class="section-sub">'+richText(p)+'</p>'; });
    html += '<div class="card"><div class="memtrack">';
    D.memoria.steps.forEach(function(step){
      var num = parseInt((step.when.match(/\d+/)||['0'])[0],10);
      var reached = num > 0 && num <= maxDoneNum;
      html += '<div class="mem-step '+(reached?'reached':'')+'"><div class="mw">'+esc(step.when)+(reached?' ✓':'')+'</div><p>'+richText(step.text)+'</p></div>';
    });
    html += '</div></div>';
    document.getElementById('screen-memoria').innerHTML = html;
  }

  // ---------- Rendering: Guia (habitos + etica + maestria) ----------
  function renderGuia(){
    var html = '<h2 class="section-title" style="margin-top:6px;">Hábitos diarios</h2>';
    html += '<p class="section-sub">Anclas de segundos insertadas en tu rutina, no cuentan como sesión.</p>';
    html += '<div class="card">';
    D.habitos.forEach(function(h){
      html += '<div class="habit-item"><span class="h-dot"></span><div><div class="h-name">'+esc(h.name)+'</div><p>'+esc(h.text)+'</p></div></div>';
    });
    html += '</div>';

    html += '<h2 class="section-title">Código de práctica ética</h2>';
    html += '<div class="card"><ul class="ethics">';
    D.etica.forEach(function(li){ html += '<li>'+richText(li)+'</li>'; });
    html += '</ul></div>';

    html += '<h2 class="section-title">Fase de maestría</h2>';
    html += '<p class="section-sub">'+esc(D.maestria.lede)+'</p>';
    html += '<div class="mastery-grid">';
    D.maestria.tiles.forEach(function(t){
      html += '<div class="mastery-tile"><div class="mt-h">'+esc(t.h)+'</div><div class="mt-v">'+esc(t.v)+'</div><p>'+esc(t.p)+'</p></div>';
    });
    html += '</div>';
    html += '<div class="card"><h3>Revisión trimestral</h3><p>'+esc(D.maestria.review)+'</p></div>';

    document.getElementById('screen-guia').innerHTML = html;
  }

  function richText(s){
    // allow <strong> already-embedded plus escape rest minimally: input already trusted (from our own data)
    return s;
  }

  // ---------- Exercises (quiz + Claude-correction) ----------
  // App-only content: not derived from data.js. Quizzes are strictly grounded in
  // facts already stated elsewhere in the app's own content (objectivity table,
  // "Cómo hacerlo" sections) since there's no access to Cris's private source material.
  var EXERCISES = {
    'day-n1-s1d1': {
      type:'quiz',
      question:'¿Cuál de estas frases es un HECHO objetivo, no una interpretación?',
      options:[
        'Parece una persona muy elegante',
        'Zapatos de piel con desgaste exclusivo en el tacón derecho',
        'Está ocultando algo, se le nota',
        'No le importa nada su aspecto'
      ],
      correct:1,
      explanation:'Un hecho objetivo es algo que cualquiera podría verificar con solo mirar: material, desgaste, ubicación exacta de una marca. Las otras tres frases son juicios sobre lo que esa persona "es" o "siente", no lo que realmente se observa — son justo lo que el filtro de objetividad te enseña a detectar.'
    },
    'day-n1-s1d2': {
      type:'claude',
      label:'Pega aquí algunos de los hechos que anotaste sobre las 2 personas del vídeo (no hace falta los 20, con 8-10 vale).',
      placeholder:'Ej: reloj metálico en la muñeca izquierda, suela de la zapatilla derecha más desgastada...',
      template:'Estoy entrenando observación para el Protocolo Jane (un método de mentalismo y lectura fría basado en hechos objetivos, deducción y trabajo de memoria). Revisa esta lista de observaciones que anoté sobre dos personas en un vídeo. Para cada línea dime si es (a) un HECHO objetivo y verificable, (b) una deducción razonable a partir de un hecho, o (c) una interpretación/juicio subjetivo disfrazado de hecho. Si es (c), dime de qué hecho objetivo debería partir y cómo reformularla. Sé breve y directo.\n\nMis observaciones:\n{{answer}}'
    },
    'day-n1-s2d2': {
      type:'claude',
      label:'Pega aquí lo que anotaste durante tu escaneo de 6 segundos de la cámara EarthCam.',
      placeholder:'Ej: 3 personas cruzando, una con paraguas rojo, un coche parado en doble fila...',
      template:'Estoy entrenando observación rápida para el Protocolo Jane. Estas son las notas que tomé tras un escaneo de solo 6 segundos de una cámara en directo (EarthCam). Revísalas y dime: ¿cuántas son hechos objetivos concretos frente a impresiones vagas o genéricas? ¿Qué 2-3 detalles debería haber captado y probablemente se me pasaron dado el tiempo tan corto? Sé breve y directo.\n\nMis notas:\n{{answer}}'
    },
    'day-n1-s3d2': {
      type:'claude',
      label:'Pega aquí tus deducciones sobre los objetos del juego de Kim (qué dedujiste de cada uno y por qué).',
      placeholder:'Ej: llavero con 4 llaves distintas → probablemente vive con más gente o tiene coche y trastero...',
      template:'Estoy entrenando deducción para el Protocolo Jane, usando el juego de Kim (memorizar y deducir a partir de un grupo de objetos). Revisa mis deducciones: para cada una, dime si estoy siendo excesivamente confiado (afirmando una sola explicación cuando hay varias igual de plausibles) y, si es así, sugiere al menos una hipótesis alternativa igual de válida que no consideré. Sé breve y directo.\n\nMis deducciones:\n{{answer}}'
    },
    'day-n1-s4d2': {
      type:'claude',
      label:'Pega aquí la transcripción de tu narración en voz alta (lo que dijiste mientras observabas).',
      placeholder:'Ej: "Veo a un hombre con chaqueta gris, parece cansado, seguro que viene de currar..."',
      template:'Esto es una transcripción de una narración en voz alta que hice mientras observaba una escena, como ejercicio del Protocolo Jane. Señálame qué frases son en realidad interpretaciones o juicios subjetivos disfrazados de observación objetiva (aunque suenen a hecho), y para cada una dime cuál sería la versión puramente objetiva. Sé breve y directo.\n\nMi narración:\n{{answer}}'
    },
    'day-n2-s1d1': {
      type:'claude',
      label:'Escribe las 3 señales de sinceridad y las 3 señales de incomodidad que identificaste, con el contexto de dónde las viste.',
      placeholder:'Sinceridad: 1) ... 2) ... 3) ...\nIncomodidad: 1) ... 2) ... 3) ...',
      template:'Estoy entrenando lectura de lenguaje no verbal para el Protocolo Jane, siguiendo el enfoque de Joe Navarro (grupos de señales y contexto, nunca un gesto aislado). Revisa mis 6 señales (3 de sinceridad, 3 de incomodidad): dime si alguna la estoy interpretando como aislada en vez de como parte de un conjunto de señales + contexto, y si el razonamiento que doy es sólido o demasiado precipitado. Sé breve y directo.\n\nMis señales:\n{{answer}}'
    },
    'day-n2-s1d2': {
      type:'quiz',
      question:'Cuando los pies de alguien apuntan hacia la puerta durante una conversación, ¿qué suele indicar?',
      options:[
        'Que tiene frío en los pies',
        'Que inconscientemente quiere marcharse de la conversación',
        'Que está mintiendo con seguridad',
        'Nada, los pies no comunican nada relevante'
      ],
      correct:1,
      explanation:'Los pies son una de las zonas del cuerpo con menos control consciente: suelen apuntar hacia donde la persona "quiere ir", física o mentalmente. No es prueba de mentira ni un dato aislado — es una señal de interés o desinterés que hay que leer junto con el resto del cuerpo.'
    },
    'day-n2-s2d1': {
      type:'quiz',
      question:'¿Cuál de estas NO es uno de los comportamientos pacificadores típicos?',
      options:[
        'Tocarse el cuello o la nuca',
        'Ajustarse la ropa o el reloj',
        'Sonreír ampliamente y mantener la mirada relajada',
        'Frotarse los dedos o entrelazar las manos'
      ],
      correct:2,
      explanation:'Los pacificadores son gestos de autocalmarse ante el estrés: tocarse el cuello, ajustar ropa, frotarse las manos o la cara. Una sonrisa amplia con mirada relajada es justo lo contrario — una señal de comodidad, no de descarga de tensión.'
    },
    'day-n2-s2d2': {
      type:'claude',
      label:'Describe los 3 pacificadores que identificaste en tus vídeos y en qué momento exacto aparecieron.',
      placeholder:'Ej: minuto 1:20, se toca el cuello justo después de que le hacen una pregunta directa...',
      template:'Estoy entrenando la detección de pacificadores (gestos de autocalmarse) para el Protocolo Jane. Revisa los 3 que identifiqué: dime si realmente son pacificadores o podrían tener otra explicación más simple (picor, costumbre, frío), y si el momento en que aparecen sugiere que están ligados a algo concreto de la conversación o no. Sé breve y directo.\n\nMis pacificadores:\n{{answer}}'
    },
    'day-n2-s3d2': {
      type:'claude',
      label:'Escribe las emociones que crees haber visto en el vídeo sin sonido y en qué gesto o expresión concreta te basaste para cada una.',
      placeholder:'Ej: sorpresa, minuto 0:40, cejas elevadas y boca ligeramente abierta...',
      template:'Estoy entrenando lectura de microexpresiones y emociones básicas para el Protocolo Jane, viendo vídeo sin sonido. Revisa mis etiquetas de emoción: para cada una dime si la expresión que describo es realmente característica de esa emoción o si podría confundirse fácilmente con otra parecida. Sé breve y directo.\n\nMis observaciones:\n{{answer}}'
    },
    'day-n2-s4d2': {
      type:'claude',
      label:'Describe la línea base de comportamiento que observaste al principio y qué desviaciones notaste después.',
      placeholder:'Línea base: hablaba pausado, manos quietas sobre la mesa...\nDesviación: al mencionar el tema X, empezó a hablar más rápido y...',
      template:'Estoy entrenando el método de línea base + desviación (baseline) para el Protocolo Jane: observar cómo se comporta alguien en reposo y luego detectar cambios significativos cuando cambia el tema o el contexto. Revisa mi línea base y mis desviaciones: dime si la desviación que describo es realmente un cambio respecto a la línea base que definí, o si en realidad no aporté suficiente línea base como para poder comparar con rigor. Sé breve y directo.\n\nMi observación:\n{{answer}}'
    },
    // --- Nivel 3: Estructura de Lectura en Frío ---
    'day-n3-s1d1': {
      type:'claude',
      label:'Pega aquí 3 o 4 de tus frases Barnum (no hace falta las 10 completas).',
      placeholder:'Ej: "A veces te muestras muy seguro de ti mismo, pero también hay una parte que duda cuando de verdad importa."',
      template:'Estoy entrenando afirmaciones tipo Barnum (frases genéricas que casi cualquiera sentiría como personales) para el Protocolo Jane, usando esta plantilla: «A veces [rasgo], aunque también hay momentos en que [rasgo opuesto] — sobre todo cuando [situación vaga]». Revisa mis frases: dime si alguna suena demasiado específica (dejaría de aplicar a la mayoría de la gente) o si se nota demasiado el molde y hay que suavizarlo. Sé breve y directo.\n\nMis frases:\n{{answer}}'
    },
    'day-n3-s2d1': {
      type:'quiz',
      question:'¿En qué consiste la Treta Arcoíris (Rainbow Ruse)?',
      options:[
        'En decir una frase Barnum y su contrario a la vez, para observar cuál valida más la otra persona',
        'En repetir la misma frase varias veces hasta que la persona la acepte',
        'En hacer solo preguntas cerradas de sí o no',
        'En hablar muy rápido para que no se note la frase genérica'
      ],
      correct:0,
      explanation:'La Treta Arcoíris afirma un rasgo y su opuesto en la misma frase («a veces eres sociable, pero también necesitas tu espacio»): sea cual sea la reacción de la otra persona, siempre validará una de las dos mitades — y esa reacción es la pista que usas para seguir bifurcando la lectura.'
    },
    'day-n3-s3d1': {
      type:'claude',
      label:'Pega aquí el guion de tu mini-lectura de 2 minutos.',
      placeholder:'1) Frase Barnum de apertura...\n2) Treta Arcoíris sobre...\n3) Pregunta abierta...\n4) Cierre...',
      template:'Estoy escribiendo el guion de una mini-lectura fría de 2 minutos para el Protocolo Jane, con esta estructura: 1) frase Barnum de apertura, 2) Treta Arcoíris sobre un tema emocional, 3) pregunta abierta para que la otra persona aporte información real, 4) cierre que suene específico usando lo que me acaba de decir. Revisa mi guion: dime si cada parte cumple su función, y si el cierre realmente conecta con la pregunta o suena genérico y desconectado. Sé breve y directo.\n\nMi guion:\n{{answer}}'
    },
    // --- Nivel 4: Lógica Inversa y Deducción ---
    'day-n4-s1d2': {
      type:'claude',
      label:'Describe qué notaste hoy en el ejercicio 5-4-3-2-1 (qué viste, oíste, tocaste, oliste y saboreaste).',
      placeholder:'5 que veo: ...\n4 que oigo: ...\n3 que toco: ...\n2 que huelo: ...\n1 que saboreo: ...',
      template:'Estoy practicando el anclaje sensorial 5-4-3-2-1 (5 cosas que veo, 4 que oigo, 3 que toco, 2 que huelo, 1 que saboreo) para entrenar atención plena, dentro del Protocolo Jane. Revisa mi lista: dime si son detalles concretos y específicos o descripciones genéricas que podría haber escrito sin prestar atención de verdad, y qué categoría se me quedó más floja. Sé breve y directo.\n\nMi lista de hoy:\n{{answer}}'
    },
    'day-n4-s2d1': {
      type:'quiz',
      question:'Según el método de hipótesis múltiples de Holmes, ¿qué deberías hacer antes de decidirte por una explicación?',
      options:[
        'Elegir la primera explicación que se te ocurra, es la más honesta',
        'Generar al menos 3 explicaciones posibles y compararlas',
        'Preguntar directamente a la persona qué le pasó',
        'Descartar cualquier explicación poco dramática'
      ],
      correct:1,
      explanation:'El método consiste en generar 3 explicaciones plausibles antes de fijarte en una — como las manchas de barro que podrían ser una excursión, jardinería o una acera rota. La primera idea que se nos ocurre suele ser la más sesgada, no la más probable.'
    },
    'day-n4-s2d2': {
      type:'claude',
      label:'Pega tus 3 objetos (o fotos) y las 3 hipótesis que generaste para cada uno.',
      placeholder:'Objeto 1: mochila desgastada → hipótesis A, B, C...',
      template:'Estoy entrenando el método de hipótesis múltiples (generar 3 explicaciones antes de decidirme por una) para el Protocolo Jane. Revisa mis hipótesis para cada objeto: dime si las 3 son realmente distintas entre sí o si en el fondo son variaciones de la misma idea, y si me quedé enganchado a la explicación más obvia (sesgo de confirmación) en vez de considerar alternativas igual de plausibles. Sé breve y directo.\n\nMis objetos e hipótesis:\n{{answer}}'
    },
    'day-n4-s3d1': {
      type:'quiz',
      question:"¿Cuál de estas describe mejor el 'cerebro de Holmes' frente al 'cerebro de Watson'?",
      options:[
        'Watson observa activamente y descarta lo irrelevante; Holmes solo mira sin analizar',
        'Holmes observa activamente comparando cada dato con lo que ya sabe; Watson ve pero no conecta la información',
        'No hay diferencia real entre los dos, es solo una forma de hablar',
        'Holmes memoriza más datos que Watson, pero razona igual de mal'
      ],
      correct:1,
      explanation:"El 'cerebro de Watson' registra datos sin conectarlos entre sí; el 'cerebro de Holmes' observa de forma activa, comparando cada dato nuevo con lo que ya sabe y descartando lo irrelevante. La diferencia no es cuánto ves, sino cuánto analizas lo que ves."
    },
    'day-n4-s3d2': {
      type:'claude',
      label:'Describe el sesgo cognitivo que detectaste hoy en tu propia deducción (confirmación, anclaje o disponibilidad) y en qué situación pasó.',
      placeholder:'Ej: hoy asumí que mi compañero llegaba tarde por pereza, y luego resultó que había tenido un problema de transporte...',
      template:'Estoy entrenando la detección de sesgos cognitivos propios (confirmación, anclaje, disponibilidad) para el Protocolo Jane. Revisa la situación que describo: dime qué sesgo concreto encaja mejor con lo que cuento y si mi propia explicación del sesgo es precisa o si en realidad estoy describiendo otra cosa. Sé breve y directo.\n\nMi situación:\n{{answer}}'
    },
    'day-n4-s4d2': {
      type:'claude',
      label:'Describe los 3 objetos que usaste, la historia que construiste a partir de ellos, y si se confirmó al preguntar.',
      placeholder:'Objetos: ...\nHistoria que deduje: ...\n¿Se confirmó?: ...',
      template:'Este es el ejercicio de hito del nivel de deducción del Protocolo Jane: construir una historia coherente a partir de 3 objetos reales y verificarla preguntando. Revisa mi cadena de deducción: dime si cada paso realmente se apoya en un objeto concreto (y no en una suposición general), y si el resultado confirma que mi razonamiento fue sólido o si acerté más por suerte que por lógica. Sé breve y directo.\n\nMi deducción:\n{{answer}}'
    },
    // --- Nivel 5: Persuasión y Palancas Cognitivas ---
    'day-n5-s1d1': {
      type:'quiz',
      question:'¿Cuál de estos es un ejemplo de RECIPROCIDAD (y no de compromiso/coherencia)?',
      options:[
        'Una tienda te da una muestra gratis y sientes más ganas de comprar algo',
        'Dices en voz alta un objetivo delante de alguien y luego te esfuerzas por cumplirlo',
        'Copias lo que hace la mayoría de la gente en una situación ambigua',
        'Sigues el consejo de alguien con bata blanca sin cuestionarlo'
      ],
      correct:0,
      explanation:'La reciprocidad es devolver un favor recibido, por pequeño que sea — la muestra gratis. La opción 2 es compromiso/coherencia (actuar según lo que ya dijiste en público), la 3 es prueba social, y la 4 es autoridad.'
    },
    'day-n5-s1d2': {
      type:'claude',
      label:'Pega aquí el mensaje que redactaste aplicando reciprocidad.',
      placeholder:'Ej: Hola [nombre], te he preparado una revisión rápida gratuita de...',
      template:'Estoy escribiendo un mensaje que aplica el principio de reciprocidad de Cialdini de forma ética (ofrecer algo de valor real antes de pedir nada a cambio), para un contexto de cliente freelance en el Protocolo Jane. Revisa mi mensaje: dime si el "regalo" que ofrezco suena genuino o interesado/manipulador, y si hay alguna frase que presione demasiado en vez de dejar la reciprocidad fluir de forma natural. Sé breve y directo.\n\nMi mensaje:\n{{answer}}'
    },
    'day-n5-s2d1': {
      type:'quiz',
      question:'¿Cuál de estos es un ejemplo de AUTORIDAD (y no de prueba social)?',
      options:[
        'Comprar el producto "más vendido" de una lista',
        'Hacer cola porque hay mucha gente esperando',
        'Seguir el consejo de alguien porque lleva bata blanca o tiene un título',
        'Leer muchas reseñas antes de decidir'
      ],
      correct:2,
      explanation:'La autoridad se basa en símbolos de estatus o conocimiento (bata blanca, título, cargo) que nos hacen seguir a alguien con menos cuestionamiento. Las otras tres opciones son prueba social: copiar lo que hace la mayoría en una situación ambigua.'
    },
    'day-n5-s2d2': {
      type:'claude',
      label:'Pega los 3 ejemplos de publicidad o redes que identificaste, y qué principio de Cialdini usa cada uno.',
      placeholder:'1) Anuncio de ... → principio: ...\n2) ...\n3) ...',
      template:'Estoy identificando principios de persuasión de Cialdini (reciprocidad, compromiso, prueba social, autoridad, simpatía, escasez) en publicidad y redes reales, para el Protocolo Jane. Revisa mis 3 ejemplos: dime si el principio que le asigné a cada uno es el correcto o si en realidad está usando otro distinto (o varios a la vez). Sé breve y directo.\n\nMis ejemplos:\n{{answer}}'
    },
    'day-n5-s3d1': {
      type:'claude',
      label:'Pega tu guion de persuasión ética de 60 segundos.',
      placeholder:'Ej: Solo tengo 2 huecos esta semana, y la mayoría de mis clientes repiten...',
      template:'Estoy escribiendo un guion de persuasión ética de 60 segundos para el Protocolo Jane, usando 1 o 2 principios de Cialdini como máximo (mezclar los 6 suena forzado). Revisa mi guion: dime cuántos principios distintos estoy usando en realidad, si se sienten naturales o forzados, y si hay alguna frase que cruce la línea de presión excesiva en vez de persuasión honesta. Sé breve y directo.\n\nMi guion:\n{{answer}}'
    },
    // --- Nivel 6: Sugestión y Forzado Psicológico ---
    'day-n6-s1d1': {
      type:'quiz',
      question:'¿Qué diferencia al mirroring (reflejo corporal y vocal) de la simple imitación?',
      options:[
        'El mirroring copia a la otra persona de forma obvia y exagerada',
        'El mirroring iguala sutilmente ritmo, volumen o postura, sin que se note como una copia',
        'No hay ninguna diferencia real, son la misma técnica',
        'El mirroring solo funciona con la voz, nunca con el cuerpo'
      ],
      correct:1,
      explanation:"El mirroring busca acercarte sutilmente a la 'frecuencia' de la otra persona (ritmo de habla, volumen, postura, gestos) para generar comodidad inconsciente. La imitación evidente hace justo lo contrario: genera rechazo porque se percibe como una copia deliberada."
    },
    'day-n6-s2d1': {
      type:'quiz',
      question:'¿Qué es una presuposición, tal como se explica en este nivel?',
      options:[
        'Una pregunta directa de sí o no',
        'Algo que la frase da por hecho de forma implícita, sin decirlo directamente',
        'Una orden disfrazada de pregunta',
        'Una frase que repite literalmente lo que dijo la otra persona'
      ],
      correct:1,
      explanation:'Una presuposición da por hecho algo dentro de la propia frase sin afirmarlo directamente — «cuando decidas cuál prefieres» da por hecho que vas a decidir, no si vas a decidir. La otra persona tiene que aceptar ese hecho implícito para poder responder.'
    },
    'day-n6-s2d2': {
      type:'claude',
      label:'Pega tus 5 frases con presuposiciones.',
      placeholder:'Ej: "Cuando decidas cuál prefieres, dímelo..."',
      template:'Estoy construyendo frases con presuposiciones (dar algo por hecho dentro de la frase, sin decirlo directamente) para el Protocolo Jane. Revisa mis 5 frases: dime cuáles realmente presuponen algo implícito y cuáles en realidad son solo preguntas directas disfrazadas, y sugiere cómo reforzar las que se queden cortas. Sé breve y directo.\n\nMis frases:\n{{answer}}'
    },
    'day-n6-s3d1': {
      type:'quiz',
      question:'¿En qué consiste el priming, tal como se explica aquí?',
      options:[
        'En decirle a alguien exactamente qué pensar sobre un tema',
        'En sembrar una palabra o idea de forma neutra para que reaparezca espontáneamente más tarde en lo que dice la otra persona',
        'En repetir la misma pregunta varias veces hasta obtener la respuesta que buscas',
        'En hablar de un tema completamente distinto para despistar'
      ],
      correct:1,
      explanation:"El priming consiste en sembrar una idea o palabra de forma neutra al principio de la conversación (por ejemplo, mencionar 'el mar' varias veces) para que reaparezca de forma espontánea más tarde, sin que la otra persona note la conexión."
    },
    'day-n6-s3d2': {
      type:'claude',
      label:'Describe qué palabra o idea sembraste, y si reapareció más tarde en la conversación sin que tú la reintrodujeras.',
      placeholder:'Sembré: ...\n¿Reapareció?: ...\nEn qué momento: ...',
      template:'Estoy practicando priming conversacional (sembrar una idea neutra para ver si reaparece espontáneamente más tarde) para el Protocolo Jane. Revisa mi caso: dime si lo que describo es realmente una prueba de que el priming funcionó, o si podría explicarse igual de bien por casualidad o porque el tema surgía de forma natural en esa conversación de todos modos. Sé breve y directo.\n\nMi caso:\n{{answer}}'
    },
    'day-n6-s4d1': {
      type:'claude',
      label:'Pega los 2-3 patrones de forzado que elegiste, cada uno con un ejemplo de frase real que usarías.',
      placeholder:'Patrón 1: ... → frase: ...\nPatrón 2: ...',
      template:'Estoy eligiendo patrones de forzado psicológico (guiar una elección entre opciones sin que se note) para mi rutina del Protocolo Jane. Revisa mis patrones y frases: dime si suenan naturales en una conversación real o si se nota demasiado el truco, y si alguno cruza la línea de manipulación en vez de quedarse en persuasión/juego aceptado por la otra persona. Sé breve y directo.\n\nMis patrones:\n{{answer}}'
    },
    'day-n6-s5d1': {
      type:'claude',
      label:'Escribe con tus propias palabras dónde trazas tú la línea entre persuasión ética y manipulación, aplicado a lo que has practicado en este nivel (mirroring, presuposiciones, priming, forzado).',
      placeholder:'Para mí la línea está en...',
      template:'Como cierre del nivel más delicado del Protocolo Jane (mirroring, presuposiciones, priming, forzado), estoy escribiendo dónde trazo la línea entre persuasión ética y manipulación. Lee mi reflexión y dime si es honesta y específica, o si en algún punto suena a justificación genérica que no me comprometería realmente a cumplir. No hace falta que seas duro, pero sí sincero. Sé breve y directo.\n\nMi reflexión:\n{{answer}}'
    },
    // --- Nivel 7: Rutina de Mentalismo en Vivo ---
    'day-n7-s1d2': {
      type:'claude',
      label:'Pega el esquema de tu rutina de 8-10 minutos (las 4 partes: observación, cold reading, forzado, cierre).',
      placeholder:'1) Observación inicial: ...\n2) Cold reading: ...\n3) Forzado: ...\n4) Cierre: ...',
      template:'Estoy estructurando mi rutina final de mentalismo de 8-10 minutos para el Protocolo Jane, con 4 partes: observación inicial, cold reading, forzado y cierre. Revisa mi esquema: dime si las 4 partes están bien equilibradas en tiempo y contenido, y si el cierre realmente conecta con lo que pasó antes o queda suelto. Sé breve y directo.\n\nMi esquema:\n{{answer}}'
    },
    'day-n7-s2d1': {
      type:'claude',
      label:'Tras ensayarla a solas y cronometrarla dos veces, ¿qué parte tuviste que recortar (si alguna) y por qué?',
      placeholder:'Tiempo primera vez: ... min\nTiempo segunda vez: ... min\nQué recorté: ...',
      template:'Acabo de ensayar mi rutina de mentalismo de 8-10 minutos para el Protocolo Jane, cronometrándola dos veces. Te cuento qué parte tuve que recortar (si alguna) y por qué. Dime si recortar esa parte concreta tiene sentido dado lo que hace cada bloque (observación, cold reading, forzado, cierre), o si sacrifiqué algo que debería haber conservado. Sé breve y directo.\n\nMi ensayo:\n{{answer}}'
    },
    'day-n7-s2d2': {
      type:'claude',
      label:'Pega el feedback que te dio la persona a la que hiciste la rutina (qué le sorprendió más, qué preguntó al final).',
      placeholder:'Dijo que lo que más le sorprendió fue...',
      template:'Acabo de hacer mi rutina completa de mentalismo a una persona real, como parte del Protocolo Jane, y esto es el feedback que me dio. Revísalo conmigo: dime qué me dice ese feedback sobre qué partes de la rutina funcionan bien y cuáles podrían necesitar trabajo, basándote solo en lo que cuento. Sé breve y directo.\n\nEl feedback que recibí:\n{{answer}}'
    },
    'day-n7-s3d1': {
      type:'claude',
      label:'Pega la parte de tu guion que sonó más forzada según el feedback, y cómo la has reescrito (antes y después).',
      placeholder:'Antes: ...\nDespués: ...',
      template:'Estoy reescribiendo la parte más floja de mi rutina de mentalismo (Protocolo Jane) según el feedback real que recibí. Te paso la versión antigua y la nueva juntas. Dime si la nueva versión resuelve de verdad el problema que señaló el feedback, o si sigue sonando forzada por otro motivo. Sé breve y directo.\n\n{{answer}}'
    }
  };

  // ---------- Lesson flow ----------
  var lessonEl, lessonBody, lessonProgress, lessonBottom, lessonTagPill;
  var currentLesson = null; // {levelIndex, session, screens:[], idx}

  function buildScreens(levelIndex, session){
    var lvl = D.levels[levelIndex];
    var screens = [];
    screens.push({ type:'brief', session:session, lvl:lvl });
    if (EXERCISES[session.id]) {
      screens.push({ type:'exercise', session:session, ex:EXERCISES[session.id] });
    }
    // attach simcard on the last session of a level that has one
    var isLastOfLevel = lvl.sessions[lvl.sessions.length-1].id === session.id;
    if (isLastOfLevel && lvl.simcards && lvl.simcards.length) {
      lvl.simcards.forEach(function(sc){ screens.push({ type:'sim', sim:sc }); });
    }
    screens.push({ type:'done', session:session });
    return screens;
  }

  function openLesson(sessionId){
    var flat = allSessionsFlat();
    var found = null;
    for (var i=0;i<flat.length;i++){ if (flat[i].session.id === sessionId){ found = flat[i]; break; } }
    if (!found) return;
    currentLesson = { levelIndex:found.levelIndex, session:found.session, lvl:found.level, screens:buildScreens(found.levelIndex, found.session), idx:0 };
    lessonEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderLessonScreen();
  }

  function closeLesson(){
    lessonEl.classList.remove('open');
    document.body.style.overflow = '';
    currentLesson = null;
    renderHome();
  }

  function openSimStandalone(lvl){
    // open lesson-like flow but jump straight to the sim screen(s) + done screen, no completion toggle tied to a specific session
    var lastS = lvl.sessions[lvl.sessions.length-1];
    openLesson(lastS.id);
    // jump to first sim screen
    if (currentLesson) {
      var simIdx = currentLesson.screens.findIndex(function(sc){ return sc.type === 'sim'; });
      if (simIdx >= 0) { currentLesson.idx = simIdx; renderLessonScreen(); }
    }
  }

  function renderLessonScreen(){
    if (!currentLesson) return;
    var scr = currentLesson.screens[currentLesson.idx];
    var total = currentLesson.screens.length;
    lessonTagPill.textContent = currentLesson.session.tag;
    lessonTagPill.className = 'lesson-tagpill ' + (currentLesson.session.tag==='Larga'?'larga':'rapida');

    // progress segments
    lessonProgress.innerHTML = '';
    for (var i=0;i<total;i++){
      var seg = document.createElement('div');
      seg.className = 'seg' + (i < currentLesson.idx ? ' filled' : (i===currentLesson.idx ? ' current' : ''));
      lessonProgress.appendChild(seg);
    }

    var html = '';
    var nextLabel = 'Continuar';
    var showGhostSkip = false;

    if (scr.type === 'brief') {
      html += '<div class="lesson-card">';
      html += '<div class="lesson-kicker"><span class="lk-ico">📍</span>'+esc(scr.lvl.cat)+' · '+esc(scr.lvl.name)+'</div>';
      html += '<div class="lesson-title">'+esc(scr.session.label)+'</div>';
      html += '<div class="lesson-steplist">';
      scr.session.steps.forEach(function(st){
        html += '<div class="lesson-step-item"><span class="step-tag '+(st.tag==='Ver'?'ver':'haz')+'">'+esc(st.tag)+'</span><span class="step-text">'+st.html+'</span></div>';
      });
      html += '</div>';
      if (scr.session.duracion) {
        html += '<div class="lesson-subsection"><div class="lesson-kicker sub"><span class="lk-ico">⏱️</span>Duración</div>';
        html += '<div class="lesson-box"><div class="lesson-text">'+scr.session.duracion+'</div></div></div>';
      }
      if (scr.session.como) {
        html += '<div class="lesson-subsection"><div class="lesson-kicker sub"><span class="lk-ico">💡</span>Cómo hacerlo</div>';
        html += '<div class="lesson-box"><div class="lesson-text">'+scr.session.como+'</div></div></div>';
      }
      html += '<div class="lesson-subsection"><div class="lesson-kicker sub"><span class="lk-ico">🏛️</span>Palacio de la memoria · ~15 min</div>';
      html += '<div class="lesson-box memoria"><div class="lesson-text">'+scr.session.memoria+'</div></div></div>';
      html += '</div>';
    } else if (scr.type === 'exercise' && scr.ex.type === 'quiz') {
      html += '<div class="lesson-card exbox">';
      html += '<div class="lesson-kicker"><span class="lk-ico">🧠</span>Ejercicio rápido</div>';
      html += '<div class="lesson-title" style="font-size:1.15rem;">'+esc(scr.ex.question)+'</div>';
      html += '<div class="quiz-options" id="quizOptions">';
      scr.ex.options.forEach(function(opt, oi){
        html += '<button class="quiz-opt" data-oi="'+oi+'">'+esc(opt)+'</button>';
      });
      html += '</div>';
      html += '<div class="quiz-feedback" id="quizFeedback"></div>';
      html += '</div>';
    } else if (scr.type === 'exercise' && scr.ex.type === 'claude') {
      var savedAnswer = state.exerciseAnswers[scr.session.id] || '';
      html += '<div class="lesson-card exbox">';
      html += '<div class="lesson-kicker"><span class="lk-ico">✍️</span>Ejercicio con corrección</div>';
      html += '<div class="lesson-text" style="margin-bottom:12px;">'+esc(scr.ex.label)+'</div>';
      html += '<textarea id="exAnswerText" class="ex-textarea" placeholder="'+esc(scr.ex.placeholder||'Escribe aquí...')+'">'+esc(savedAnswer)+'</textarea>';
      html += '<button class="copy-btn" id="copyExBtn">📋 Copiar para pedir corrección a Claude</button>';
      html += '</div>';
    } else if (scr.type === 'sim') {
      html += '<div class="lesson-card simbox"><div class="lesson-kicker"><span class="lk-ico">🎭</span>'+esc(scr.sim.eyebrow)+'</div>';
      html += '<div class="lesson-title" style="font-size:1.15rem;">'+esc(scr.sim.title)+'</div>';
      html += '<div class="lesson-text">'+esc(scr.sim.desc)+'</div>';
      html += '<pre id="simPromptText">'+esc(scr.sim.prompt)+'</pre>';
      html += '<button class="copy-btn" id="copySimBtn">📋 Copiar para pegar en el chat</button>';
      html += '</div>';
    } else if (scr.type === 'done') {
      var already = !!state.checks[scr.session.id];
      html += '<div class="lesson-done-wrap">';
      html += '<div class="lesson-done-emoji pop-in">'+(already?'✅':'🎉')+'</div>';
      html += '<h2 class="fade-in-1">'+(already ? 'Ya la tenías marcada' : '¡Sesión lista!')+'</h2>';
      html += '<p class="fade-in-2">'+esc(scr.session.label)+' — '+esc(currentLesson.lvl.name)+'</p>';
      if (!already) html += '<div class="lesson-xp-chip fade-in-3">+'+(scr.session.tag==='Larga'?XP_LARGA:XP_RAPIDA)+' XP</div>';
      html += '</div>';
    }

    lessonBody.innerHTML = html;

    if (scr.type === 'sim') {
      document.getElementById('copySimBtn').addEventListener('click', function(){
        var txt = scr.sim.prompt;
        var btn = this;
        var done = function(){ btn.classList.add('copied'); btn.textContent = '✓ Copiado'; setTimeout(function(){ btn.classList.remove('copied'); btn.textContent='📋 Copiar para pegar en el chat'; },1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(done).catch(function(){ fallbackCopy(txt); done(); });
        } else { fallbackCopy(txt); done(); }
      });
    }

    if (scr.type === 'exercise' && scr.ex.type === 'quiz') {
      var quizAnswered = false;
      document.querySelectorAll('.quiz-opt').forEach(function(btn){
        btn.addEventListener('click', function(){
          if (quizAnswered) return;
          quizAnswered = true;
          var oi = parseInt(btn.getAttribute('data-oi'),10);
          document.querySelectorAll('.quiz-opt').forEach(function(b2, i2){
            b2.classList.add('locked');
            if (i2 === scr.ex.correct) b2.classList.add('correct');
            else if (i2 === oi) b2.classList.add('incorrect');
          });
          var fb = document.getElementById('quizFeedback');
          fb.classList.add('show', oi === scr.ex.correct ? 'ok' : 'bad');
          fb.innerHTML = '<strong>'+(oi === scr.ex.correct ? '¡Exacto! ' : 'No exactamente. ')+'</strong>'+esc(scr.ex.explanation);
        });
      });
    }

    if (scr.type === 'exercise' && scr.ex.type === 'claude') {
      var exTa = document.getElementById('exAnswerText');
      exTa.addEventListener('input', function(){
        state.exerciseAnswers[scr.session.id] = exTa.value;
        save();
      });
      document.getElementById('copyExBtn').addEventListener('click', function(){
        var val = exTa.value.trim();
        var txt = scr.ex.template.replace('{{answer}}', val || '(no escribí nada todavía)');
        var btn = this;
        var doneFn = function(){ btn.classList.add('copied'); btn.textContent = '✓ Copiado'; setTimeout(function(){ btn.classList.remove('copied'); btn.textContent='📋 Copiar para pedir corrección a Claude'; },1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(doneFn).catch(function(){ fallbackCopy(txt); doneFn(); });
        } else { fallbackCopy(txt); doneFn(); }
      });
    }

    // bottom button(s)
    var bottomHtml = '';
    if (scr.type === 'done') {
      var already = !!state.checks[scr.session.id];
      bottomHtml += '<button class="lesson-next-btn" id="lessonDoneBtn">'+(already ? 'Desmarcar y volver' : 'Marcar como completada')+'</button>';
      bottomHtml += '<button class="lesson-next-btn ghost" id="lessonBackBtn2">Volver al camino sin marcar</button>';
    } else {
      bottomHtml += '<button class="lesson-next-btn" id="lessonNextBtn">'+nextLabel+' →</button>';
    }
    lessonBottom.innerHTML = bottomHtml;

    var nb = document.getElementById('lessonNextBtn');
    if (nb) nb.addEventListener('click', function(){
      currentLesson.idx++;
      if (currentLesson.idx >= currentLesson.screens.length) { closeLesson(); return; }
      renderLessonScreen();
    });
    var db = document.getElementById('lessonDoneBtn');
    if (db) db.addEventListener('click', function(){
      var sid = currentLesson.session.id;
      var willBeDone = !state.checks[sid];
      state.checks[sid] = willBeDone;
      if (willBeDone) state.sessionDates[sid] = todayStr(); else delete state.sessionDates[sid];
      save();
      closeLesson();
    });
    var db2 = document.getElementById('lessonBackBtn2');
    if (db2) db2.addEventListener('click', function(){ closeLesson(); });
  }

  function fallbackCopy(text){
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    } catch(e){}
  }

  // ---------- Install prompt ----------
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    if (!state.dismissedInstall && !isStandalone()) showInstallToast(false);
  });
  window.addEventListener('appinstalled', function(){ hideInstallToast(); });

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function isIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  var installAutoHideTimer = null;
  function showInstallToast(iosMode){
    var t = document.getElementById('installToast');
    if (!t) return;
    document.getElementById('installToastText').innerHTML = iosMode
      ? '<strong>Añade Protocolo Jane a tu pantalla de inicio</strong>Toca compartir ⮕ y luego "Añadir a pantalla de inicio".'
      : '<strong>Instala Protocolo Jane</strong>Acésalo como una app, sin barra de navegador.';
    document.getElementById('installGoBtn').style.display = iosMode ? 'none' : '';
    t.classList.add('show');
    // safety net: auto-hide after a few seconds no matter what, in case taps don't register
    // on this device (it will simply try again next time the app is opened)
    if (installAutoHideTimer) clearTimeout(installAutoHideTimer);
    installAutoHideTimer = setTimeout(hideInstallToast, 9000);
  }
  function hideInstallToast(){
    var t = document.getElementById('installToast');
    if (t) t.classList.remove('show');
    if (installAutoHideTimer) { clearTimeout(installAutoHideTimer); installAutoHideTimer = null; }
  }

  // ---------- Init ----------
  function init(){
    lessonEl = document.getElementById('lesson');
    lessonBody = document.getElementById('lessonBody');
    lessonProgress = document.getElementById('lessonProgress');
    lessonBottom = document.getElementById('lessonBottom');
    lessonTagPill = document.getElementById('lessonTagPill');

    document.getElementById('lessonCloseBtn').addEventListener('click', closeLesson);

    TAB_IDS.forEach(function(t){
      document.getElementById('tab-'+t).addEventListener('click', function(){ showTab(t); });
    });

    function dismissInstallToast(){
      hideInstallToast();
      state.dismissedInstall = true; save();
    }
    document.getElementById('installGoBtn').addEventListener('click', function(e){
      e.stopPropagation();
      hideInstallToast();
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(function(){ deferredPrompt = null; }); }
      else { state.dismissedInstall = true; save(); }
    });
    document.getElementById('installXBtn').addEventListener('click', function(e){
      e.stopPropagation();
      dismissInstallToast();
    });
    // whole bar is also tappable to dismiss, in case the small X is hard to hit precisely on some phones
    document.getElementById('installToast').addEventListener('click', dismissInstallToast);

    renderAll();
    showTab('camino');

    if (!isStandalone() && isIOS() && !state.dismissedInstall) {
      setTimeout(function(){ showInstallToast(true); }, 1200);
    }

    window.addEventListener('online', updateOfflineBanner);
    window.addEventListener('offline', updateOfflineBanner);
    updateOfflineBanner();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(function(){});
    }
  }

  function updateOfflineBanner(){
    var b = document.getElementById('offlineBanner');
    if (!b) return;
    b.classList.toggle('show', !navigator.onLine);
  }

  function renderAll(){
    renderHome();
    renderProgreso();
    renderMemoria();
    renderGuia();
    var top = document.getElementById('topStreak');
    var topXp = document.getElementById('topXp');
    if (top) top.textContent = computeStreak();
    if (topXp) topXp.textContent = computeXP();
  }

  // re-render top stats + home whenever we close a lesson (handled in closeLesson->renderHome, but stats pills need refresh too)
  var _origRenderHome = renderHome;
  renderHome = function(){
    _origRenderHome();
    var top = document.getElementById('topStreak');
    var topXp = document.getElementById('topXp');
    if (top) top.textContent = computeStreak();
    if (topXp) topXp.textContent = computeXP();
    renderProgreso();
    renderMemoria();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
