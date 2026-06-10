/** Inline script to apply theme class before paint (replaces next-themes inline script). */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("theme")||"system",r=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":t;if(r==="dark")d.classList.add("dark");else d.classList.remove("dark")}catch(e){}})();`;
