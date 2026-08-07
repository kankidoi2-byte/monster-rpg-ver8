(function(){
  let titleForceClosed = false;
  function forceCloseTitle(){
    if (titleForceClosed) return;
    titleForceClosed = true;
    try{
      document.body.classList.remove('title-mode');
      const screen = document.getElementById('titleScreen');
      if (screen) screen.remove();
      if (typeof show === 'function') show('home');
    }catch(_e){ /* ここで失敗しても他に打てる手はないので握りつぶす */ }
  }
  window.addEventListener('error', function(){
    // タイトル画面がまだ表示されている状態でエラーが起きた場合のみ介入する
    if (document.body.classList.contains('title-mode')) forceCloseTitle();
  });
  // 万一initTitleScreen自体が定義・実行されないまま数秒経過した場合の保険
  window.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      if (document.body.classList.contains('title-mode') && typeof initTitleScreen !== 'function') forceCloseTitle();
    }, 3000);
  });
})();
