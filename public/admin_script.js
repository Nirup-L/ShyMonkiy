window.addEventListener("DOMContentLoaded", () => {

console.log("all ready!");

});

function createCollection()
{
    const ref = db.ref(`admin/disableSite`);
    ref.set({flag:true});
    console.log("done");
}