let client;

$(function() {
    let groups = [];
    // pass in as parameter, update during recursion
    let payload = {
        url: '/api/v2/groups.json',
        type: 'GET'
    }
    // notice the chain of calls, Zendesk and JS require
    // promises and async
    client = ZAFClient.init(); // zendesk client object
    return getGroups(groups, payload);
})

function getGroups(groups, payload) {
    // example of a promise being used, notice the recursion
    // and chain of return functions
    return client.request(payload).then((response) => {
        console.log('Response: ', response)
        console.log(`groups [${response['groups'].length}]:  ${response['groups']}`);
        groups = groups.concat(response['groups']);
        if (response['next_page']) {
            // if has_more is true, pagination continues
            payload['url'] = response['next_page'];
            return getGroups(groups, payload);
            // recursive call
        } else {
            console.log('groups after getGroups(): ', groups)
            groups.push({'name': 'personal', 'id': 'personal', 'views': []});
            buildGroupsTable(groups);
        }
    })
}

function buildGroupsTable(groups) {
    Handlebars.registerHelper('json', function(context) {
        return JSON.stringify(context);
    });
    console.log('buildGroupsTable()');
    console.log('Groups: ', groups);
    let blob = {'groups': groups}
    let source = $('#groups_template').html();
    let template = Handlebars.compile(source);
    let html = template(blob);
    $('#groups_content').html(html);
    console.log('Groups table built.');
    let newGroups = document.querySelectorAll('.clickableGroup');
    // console.log('newGroups: ', newGroups);

    for (let e of newGroups) {
        e.onclick = () =>{
            let newGroup = e.getAttribute('data-group');
            console.log('newGroup: ', newGroup);
            let newGroupJSON = JSON.parse(newGroup);
            loadGroupViews(newGroupJSON);
            }
        }
    return;
}

function viewlinkTo(viewID) {
    console.log('linkTo for view: ' , viewID)
    client.invoke('routeTo', 'views', viewID);
    return;
};

function loadGroupViews(group) { 
    console.log('onclick for group: ', group['id'], ': ', group);
    if (group['id'] == 'personal') {
        // if the custom 'personal' views group is clicked
        // simply pass in the views, else dynamically lookup views
        console.log('Look here!');
        let payload = {
            url: '/api/v2/views/active.json',
            type: 'GET'
        }
        let personalViews = []
        let user_id;
        client.get('currentUser').then((response)=> {
            console.log('response: ', response);
            user_id = response['currentUser']['id'];
            return getPersonalViews(personalViews, payload, user_id);
        });
    } else {
        // setup payload for recursive call
        // update the url after each iter
        console.log('No, look here!');
        let payload = {
            url: '/api/v2/views/search.json',
            type: 'GET',
            data: `query=group_id:${group['id']}&active:true`,
            dataType: 'json'
        }
        let groupViews = [];
        console.log('Group ID: ', group['id'], '\nPayload: ', payload);
        return getGroupViews(groupViews, payload);
    }
}

function getPersonalViews(personalViews, payload, user_id) {
    return client.request(payload).then((response) => {
        console.log('getPersonalViews(): ', response);
        personalViews = personalViews.concat(response['views']);
        if (response['next_page']) {
            payload['url'] = response['next_page'];
            return getPersonalViews(personalViews, payload, user_id);
        } else {
            let filteredPersonalViews = [];
            for (let v of personalViews) {
                if (v['restriction']) {
                    if (v['restriction']['type'] == 'User') {
                        if (v['restriction']['id'] == user_id) {
                            filteredPersonalViews.push(v);
                        } else {
                            console.log('Mismatched user_ids for view: ', v['title'], 'user_id for view: ', v['restriction']['id'], 'user_id of current user: ', user_id);
                        }
                    } else {
                        console.log('Mismatch on view\'s restriction: ', v['title']);
                    }
                } else {
                    console.log('View w/no restrictions: ', v['title']);
                }
            }
            console.log('Filtered Personal Views: ', filteredPersonalViews);
            return updateViews(filteredPersonalViews);
        }
    })
}

function getGroupViews(groupViews, payload) {
    return client.request(payload).then((response) => {
        console.log('getGroupViews(): ', response);
        groupViews = groupViews.concat(response['views']);
        if (response['next_page']) {
            payload['url'] = response['next_page'];
            return getGroupViews(groupViews, payload);
        } else {
            console.log('groupViews after getGroupViews(): ', groupViews)
            return updateViews(groupViews);
        }
    })
}

function updateViews(views) {
    Handlebars.registerHelper('json', function(context) {
        return JSON.stringify(context);
    });
    console.log('updateViews()');
    console.log('Views: ', views);
    let blob = {'views': views};
    let source = $('#views_template').html();  
    let template = Handlebars.compile(source);
    let html = template(blob);
    $('#views_content').html(html);
    let newViews = document.querySelectorAll('.clickableView');
    for (let e of newViews) {
        e.onclick = () => {
            let newView = e.getAttribute('data-view');
            console.log('view: ' , view);
            let newViewJSON = JSON.parse(newView);
            console.log('newView ID: ', newViewJSON['id']);
            viewlinkTo(newViewJSON['id']);
        }
    }
    return;
}