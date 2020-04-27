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
}, "A1TEXT",React.createElement("div", {
    id: "B1",
    style: style
}, "B1TEXT", React.createElement("div", {
    id: "C1",
    style: style
}, "C1TEXT"),React.createElement("div", {
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