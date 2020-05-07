import React from './react';
import ReactDOM from './react-dom';

let style = {
    border: '3px solid red',
    margin: '5px'
};
// let element = (
//     <div id="A1" style={style}>
//         A1TEXT
//         <div id="B1" style={style}>
//             B1TEXT
//             <div id="C1" style={style}>C1TEXT</div>
//             <div id="C2" style={style}>C2TEXT</div>
//         </div>
//         <div id="B2" style={style}>
//             B2TEXT
//         </div>
//     </div>
// )



let element = React.createElement("div", {
    id: "A1",
    style: style
}, "A1TEXT", React.createElement("div", {
    id: "B1",
    style: style
}, "B1TEXT", React.createElement("div", {
    id: "C1",
    style: style
}, "C1TEXT"), React.createElement("div", {
    id: "C2",
    style: style
}, "C2TEXT")), React.createElement("div", {
    id: "B2",
    style: style
}, "B2TEXT"));

console.log(element);


ReactDOM.render(
    element,
    document.getElementById('root')
)


let render2 = document.getElementById('render2');
render2.addEventListener('click', () => {
    console.log('render2')
    let element2 = (
        <div id="A1-new" style={style}>
            A1TEXT-new
            <div id="B1-new" style={style}>
                B1TEXT-new
                <div id="C1-new" style={style}>C1TEXT-new</div>
                <div id="C2-new" style={style}>C2TEXT-new</div>
            </div>
            <div id="B2-new" style={style}>
                B2TEXT-new
            </div>
            <div id="B3" style={style}> B3</div>
        </div>
    )
    ReactDOM.render(
        element2,
        document.getElementById('root')
    )
})



let render3 = document.getElementById('render3');
render3.addEventListener('click', () => {
    let element3 = (
        <div id="A1-new2" style={style}>
            A1TEXT-new2
            <div id="B1-new2" style={style}>
                B1TEXT-new2
                <div id="C1-new2" style={style}>C1TEXT-new2</div>
                <div id="C2-new2" style={style}>C2TEXT-new2</div>
            </div>
            <div id="B2-new2" style={style}>
                B2TEXT-new2
            </div>
        </div>
    )
    ReactDOM.render(
        element3,
        document.getElementById('root')
    )
})