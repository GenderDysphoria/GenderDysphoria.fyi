# ganttrans

This project is a really basic web UI for creating a Gantt Chart of all the steps needed to transition. Please see Disclaimer.html for all the disclaimer details (I'm not a medical professional, talk to your doctor, this site stores no personal info, etc.).

If you want to help me out by making the frontend shinier, ping me on a PR.

## Running the Project locally

Use 

```
node index.js
```

To start the node server on port 8080. Navigate a browser to localhost:8080 to view content.

## Running with docker

```

docker build -t my-transition-planner .
docker run my-transition-planner -p 8080:8080

```

or

```
docker-compose up -d .
```

## Running in kubernetes

This is a bit more advanced, you can use the attached helm chart for this if desired.

Louis(e)



    /*
    Onset: 
    3-6 month onset:
    Body fat
    Decreased muscle mass
    skin softening
    Breast Growth
    Smaller Testes

    1-3 month onset
    decreased libido
    decreased erections
    mood changes

    6-12 month:
    Thinning body hair


    Max effect:

    2-5 years
    body fat

    1-2 years 
    decreased strength
    decreased libido

    3-6 months decreased erections

    2-3 years:
    breast growth
    testicular volume

    3+ years:
    body hair

    male baldness:
    1-2 years

    */