export default class APIService{
    static InsertNode(body){
        return fetch(`https://arg-llm-api-rag-acebe09e8eeb.herokuapp.com:5000/add`,{
            'method':'POST',
             headers : {
            'Content-Type':'application/json'
      },
      body:JSON.stringify(body)
    })
    .then(response => response.json())
    .catch(error => console.log(error))
    }

    static AskHypotheses(question) {
      return fetch(`https://arg-llm-api-rag-acebe09e8eeb.herokuapp.com/generate_hypotheses/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question })
          })
              .then(r => r.json())
    }
}
