import React from './react';
import ReactDOM from './react-dom';

// useState是一个语法糖，基于useReducer
class ClassCounter extends React.Component {
    constructor(props) {
        super(props);
        this.state = { number: 0 };
    }

    onClick = () => {
        this.setState(state => ({ number: state.number + 1 }));
    }

    render() {
        return (
            <div id="counter">
                <span>{this.state.number}</span>
                <button onClick={this.onClick}> 加1</button>
            </div>
        )
    }
}
const ADD = 'ADD';

function FunctionCounter() {
    const [countState, dispatch] = React.useReducer(reducer, { count: 0});
    const [numberState, setNumberState] = React.useState({number:0});
    console.log(numberState.number + 1)
    let newState = numberState.number + 1;
    console.log('newState', newState);
    
    return (
        <div>
            <div id="counter1">
                <span>{countState.count}</span>
                <button onClick={() => dispatch({ type: ADD })}> 加1</button>
            </div>
            <div id="counter2">
                <span>{numberState.number}</span>
                <button onClick={() => setNumberState({ number: newState})}> 加1</button>
            </div>
        </div>
    )
}

function reducer(state, action) {
    switch (action.type) {
        case 'ADD':
            return { count: state.count + 1 };
        default:
            return state;
    }
}

ReactDOM.render(<FunctionCounter name='计数器' />, document.getElementById('root'));
