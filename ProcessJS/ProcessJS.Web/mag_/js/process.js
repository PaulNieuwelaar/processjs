/*
    // Call an Action
    Process.callAction("mag_actionname",
        [{
            key: "Target",
            type: Process.Type.EntityReference,
            value: { id: Xrm.Page.data.entity.getId(), entityType: "lead" }
        }],
        function (params) {
            // Success
            for (var i = 0; i < params.length; i++) {
                alert(params[i].key + "=" + params[i].value);
            }
        },
        function (e) {
            // Error
            alert(e);
        }
    );

    // Call a Workflow
    Process.callWorkflow("4AB26754-3F2F-4B1D-9EC7-F8932331567A", Xrm.Page.data.entity.getId(),
        function () {
            alert("Workflow executed successfully");
        },
        function () {
            alert("Error executing workflow");
        });

    // Call a Dialog
    Process.callDialog("C50B3473-F346-429F-8AC7-17CCB1CA45BC", "contact", Xrm.Page.data.entity.getId(), 
        function () { 
            Xrm.Page.data.refresh(); 
        });
*/

var Process = Process || {};

// Supported Action input parameter types
Process.Type = {
    Bool: "c:boolean",
    Int: "c:int",
    String: "c:string",
    DateTime: "c:dateTime",
    EntityReference: "a:EntityReference",
    OptionSet: "a:OptionSetValue",
    Money: "a:Money"
}

// inputParams: Array of parameters to pass to the Action. Each param object should contain key, value, and type.
// successCallback: Function accepting 1 argument, which is an array of output params, each containing key, and value.
// errorCallback: Function accepting 1 argument, which is the string error message. Can be null.
// Unless the Action is global, you must specify a 'Target' input parameter as EntityReference
// actionName is required
Process.callAction = function (actionName, inputParams, successCallback, errorCallback, url) {
    if (url == null) {
        url = Xrm.Page.context.getClientUrl();
    }

    var requestXml = "<s:Envelope xmlns:s='http://schemas.xmlsoap.org/soap/envelope/'>" +
          "<s:Body>" +
            "<Execute xmlns='http://schemas.microsoft.com/xrm/2011/Contracts/Services' xmlns:i='http://www.w3.org/2001/XMLSchema-instance'>" +
              "<request xmlns:a='http://schemas.microsoft.com/xrm/2011/Contracts'>" +
                "<a:Parameters xmlns:b='http://schemas.datacontract.org/2004/07/System.Collections.Generic'>";

    if (inputParams) {
        // Add each input param
        for (var i = 0; i < inputParams.length; i++) {
            var param = inputParams[i];

            var value = "";
            var displayXmlns = false;

            // Check the param type to determine how the value is formed
            switch (param.type) {
                case "c:boolean":
                case "c:int":
                case "c:string":
                    value = param.value;
                    displayXmlns = true;
                    break;
                case "c:dateTime":
                    value = param.value.toISOString();
                    displayXmlns = true;
                    break;
                case "a:EntityReference":
                    value = "<a:Id>" + param.value.id + "</a:Id>" +
                      "<a:LogicalName>" + param.value.entityType + "</a:LogicalName>" +
                      "<a:Name i:nil='true' />";
                    break;
                case "a:OptionSetValue":
                case "a:Money":
                    value = "<a:Value>" + param.value + "</a:Value>";
                    break;
                default:
                    if (errorCallback) {
                        errorCallback("Type of input parameter " + (i + 1) + " '" + param.type + "' is invalid or unsupported");
                    }
                    return;
                    break;
            }

            requestXml += "<a:KeyValuePairOfstringanyType>" +
                    "<b:key>" + param.key + "</b:key>" +
                    "<b:value i:type='" + param.type + "' " + (displayXmlns ? "xmlns:c='http://www.w3.org/2001/XMLSchema'" : "") + ">" + value + "</b:value>" +
                  "</a:KeyValuePairOfstringanyType>";
        }
    }

    requestXml += "</a:Parameters>" +
                "<a:RequestId i:nil='true' />" +
                "<a:RequestName>" + actionName + "</a:RequestName>" +
              "</request>" +
            "</Execute>" +
          "</s:Body>" +
        "</s:Envelope>";

    var req = new XMLHttpRequest();
    req.open("POST", url + "/XRMServices/2011/Organization.svc/web", true);
    req.setRequestHeader("Accept", "application/xml, text/xml, */*");
    req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    req.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute");

    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status == 200) {
                // Action completed successfully - get output params
                var responseParams = req.responseXML.getElementsByTagName("a:KeyValuePairOfstringanyType"); // IE
                if (responseParams.length == 0) {
                    responseParams = req.responseXML.getElementsByTagName("KeyValuePairOfstringanyType"); // FireFox and Chrome
                }

                var outputParams = [];
                for (i = 0; i < responseParams.length; i++) {

                    var attrNameNode = responseParams[i].childNodes[0].firstChild;
                    var attributeName = attrNameNode.textContent || attrNameNode.nodeValue || attrNameNode.data || attrNameNode.text;

                    var attributeValue = "";
                    if (responseParams[i].childNodes[1].firstChild != null) {
                        var attrValueNode = responseParams[i].childNodes[1].firstChild;
                        attributeValue = attrValueNode.textContent || attrValueNode.nodeValue || attrValueNode.data || attrValueNode.text;
                    }

                    // Values will be string, figure out the types yourself
                    outputParams.push({ key: attributeName, value: attributeValue });

                    /*
                    DateTime = "2015-06-23T21:00:00Z" (AS UTC STRING)
                    bool = "true" (AS STRING)
                    OptionSet, int, etc = "1" (AS STRING)
                    */
                }

                if (successCallback) {
                    // Make sure the callback accepts exactly 1 argument - use dynamic function if you want more
                    successCallback(outputParams);
                }
            }
            else {
                // Error has occured, action failed
                if (errorCallback) {
                    var error = null;
                    try { error = req.responseXML.getElementsByTagName("Message")[0].firstChild.nodeValue; } catch (e) { }
                    errorCallback(error);
                }
            }
        }
    };

    req.send(requestXml);
}

// Runs the specified workflow for a particular record
// successCallback and errorCallback accept no arguments
// workflowId, and recordId are required
Process.callWorkflow = function (workflowId, recordId, successCallback, errorCallback, url) {
    if (url == null) {
        url = Xrm.Page.context.getClientUrl();
    }

    var request = "<s:Envelope xmlns:s='http://schemas.xmlsoap.org/soap/envelope/'>" +
          "<s:Body>" +
            "<Execute xmlns='http://schemas.microsoft.com/xrm/2011/Contracts/Services' xmlns:i='http://www.w3.org/2001/XMLSchema-instance'>" +
              "<request i:type='b:ExecuteWorkflowRequest' xmlns:a='http://schemas.microsoft.com/xrm/2011/Contracts' xmlns:b='http://schemas.microsoft.com/crm/2011/Contracts'>" +
                "<a:Parameters xmlns:c='http://schemas.datacontract.org/2004/07/System.Collections.Generic'>" +
                  "<a:KeyValuePairOfstringanyType>" +
                    "<c:key>EntityId</c:key>" +
                    "<c:value i:type='d:guid' xmlns:d='http://schemas.microsoft.com/2003/10/Serialization/'>" + recordId + "</c:value>" +
                  "</a:KeyValuePairOfstringanyType>" +
                  "<a:KeyValuePairOfstringanyType>" +
                    "<c:key>WorkflowId</c:key>" +
                    "<c:value i:type='d:guid' xmlns:d='http://schemas.microsoft.com/2003/10/Serialization/'>" + workflowId + "</c:value>" +
                  "</a:KeyValuePairOfstringanyType>" +
                "</a:Parameters>" +
                "<a:RequestId i:nil='true' />" +
                "<a:RequestName>ExecuteWorkflow</a:RequestName>" +
              "</request>" +
            "</Execute>" +
          "</s:Body>" +
        "</s:Envelope>";

    var req = new XMLHttpRequest();
    req.open("POST", url + "/XRMServices/2011/Organization.svc/web", true);

    req.setRequestHeader("Accept", "application/xml, text/xml, */*");
    req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    req.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute");
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status == 200) {
                if (successCallback) {
                    successCallback();
                }
            }
            else {
                if (errorCallback) {
                    errorCallback();
                }
            }
        }
    };

    req.send(request);
}

// Pops open the specified dialog process for a particular record
// dialogId, entityName, and recordId are required
// callback fires even if the dialog is closed/cancelled
Process.callDialog = function (dialogId, entityName, recordId, callback, url) {
    tryShowDialog("/cs/dialog/rundialog.aspx?DialogId=%7b" + dialogId + "%7d&EntityName=" + entityName + "&ObjectId=" + recordId, 600, 400, callback, url);

    // Function copied from Alert.js https://alertjs.codeplex.com
    function tryShowDialog(url, width, height, callback, baseUrl) {
        width = width || Alert._dialogWidth;
        height = height || Alert._dialogHeight;

        var isOpened = false;

        try {
            // Web (IE, Chrome, FireFox)
            if (Mscrm && Mscrm.CrmDialog && Mscrm.CrmUri && Mscrm.CrmUri.create) {
                // Use CRM light-box (unsupported)
                var crmUrl = Mscrm.CrmUri.create(url);
                var dialogwindow = new Mscrm.CrmDialog(crmUrl, window, width, height);

                // Allows for opening non-webresources (e.g. dialog processes) - CRM messes up when it's not a web resource (unsupported)
                if (!crmUrl.get_isWebResource()) {
                    crmUrl.get_isWebResource = function () { return true; }
                }

                // Open the lightbox
                dialogwindow.show();
                isOpened = true;

                // Make sure when the dialog is closed, the callback is fired
                // This part's all pretty unsupported, hence the try-catches
                // If you can avoid using a callback, best not to use one
                if (callback) {
                    try {
                        // Get the lightbox iframe (unsupported)
                        var $frame = parent.$("#InlineDialog_Iframe");
                        $frame.load(function () {
                            try {
                                // Override the CRM closeWindow function (unsupported)
                                var frameDoc = $frame[0].contentWindow;
                                var closeEvt = frameDoc.closeWindow; // OOTB close function
                                frameDoc.closeWindow = function () {
                                    // Bypasses onunload event on dialogs to prevent "are you sure..." (unsupported)
                                    try { frameDoc.Mscrm.GlobalVars.$B = false; } catch (e) { }

                                    // Fire the callback and close
                                    callback();
                                    try { closeEvt(); } catch (e) { }
                                }
                            } catch (e) { }
                        });
                    } catch (e) { }
                }
            }
        } catch (e) { }

        try {
            // Outlook
            if (!isOpened && window.showModalDialog) {
                // If lightbox fails, use window.showModalDialog
                baseUrl = baseUrl || Xrm.Page.context.getClientUrl();
                var params = "dialogWidth:" + width + "px; dialogHeight:" + height + "px; status:no; scroll:no; help:no; resizable:yes";

                window.showModalDialog(baseUrl + url, window, params);
                if (callback) {
                    callback();
                }

                isOpened = true;
            }
        } catch (e) { }

        return isOpened;
    }
}