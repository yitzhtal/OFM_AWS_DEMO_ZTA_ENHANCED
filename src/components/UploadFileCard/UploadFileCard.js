import {useEffect, useState} from "react";

import "@cloudscape-design/global-styles/index.css"
import {
    Button,
    Container,
    ExpandableSection, Flashbar,
    Form,
    FormField, Grid, Header, Input, PieChart,
    ProgressBar,
    SpaceBetween, Table, TokenGroup
} from "@cloudscape-design/components"

import {Amplify, Storage} from 'aws-amplify';
import {Predictions, AmazonAIPredictionsProvider} from '@aws-amplify/predictions';

Amplify.addPluggable(new AmazonAIPredictionsProvider());

function UploadFileCard(props) {
    console.log('UploadFileCard function log')

    const [filename, setFilename] = useState();
    const [progress, setProgress] = useState();
    const [uploaded, setUploaded] = useState(false);

    const [identify, setIdentify] = useState();
    const [interpret, setInterpret] = useState();
    const [identifyErr, setIdentifyErr] = useState(null);
    const [keyValueTokenGroup, setKeyValueTokenGroup] = useState();
    const [firstLinesTokenGroup, setFirstLinesTokenGroup] = useState();


    async function onChange(e) {
        if (props.onChange) {
            await props.onChange(e);
        }
        
        setProgress(0);
        const file = e.target.files[0];
        setFilename(file.name);
        try {
            var response = await Storage.put(file.name, file, {
                progressCallback(progress) {
                    setProgress(progress.loaded * 100 / progress.total);
                },
                level: props.level,
//                useAccelerateEndpoint: false,
                region: "us-east-1",
                bucket: "amplify-ofmawsdemoenhanced-dev-5108d-deployment"
            });
            setUploaded(true);
        } catch (error) {
            console.log("Error uploading file: ", error);
        }

        console.log("File to identify:", file);
        var responseIdentify = await onIdentify(file);
        console.log("Response from onIdentify:", responseIdentify);

        if (responseIdentify && responseIdentify.text) {
            console.log("Full text to interpret:", responseIdentify.text.fullText);
            var responseInterpret = await onInterpret(responseIdentify.text.fullText);
            console.log("Response from onInterpret:", responseInterpret);
        } else {
            console.log("responseIdentify or responseIdentify.text is null or undefined");
        }

    }

    async function onIdentify(file) {
        try {
            console.log("onIdentify function started.");
            console.log("File received for identification: ", file);
            console.log("Predictions object: ", Predictions);

            var respPrediction = await Predictions.identify({
                text: {
                    source: {
                        file
                    }
                }
            });

            // Log the response from Predictions.identify
            console.log("Prediction response: ", respPrediction);

            setIdentify(respPrediction);
            if (!respPrediction) {
                console.log("Prediction response is null or undefined.");
                return null;
            }

            var keyValuesGroupArray = [];
            var firstLinesGroupArray = [];

            if (respPrediction.text && respPrediction.text.keyValues) {
                console.log("Processing keyValues...");
                respPrediction.text.keyValues.forEach((each) => {
                    keyValuesGroupArray.push({
                        label: each.key,
                    });
                });
            } else {
                console.log("No keyValues found in response.");
            }

            if (respPrediction.text && respPrediction.text.lines) {
                console.log("Processing first 5 lines...");
                for (var i = 0; i < Math.min(5, respPrediction.text.lines.length); i++) {
                    firstLinesGroupArray.push({
                        label: "Line " + i + ": " + respPrediction.text.lines[i],
                    });
                }
            } else {
                console.log("No lines found in response.");
            }

            setKeyValueTokenGroup(keyValuesGroupArray);
            setFirstLinesTokenGroup(firstLinesGroupArray);
            setIdentifyErr(null);

            console.log("Returning prediction: ", respPrediction);
            return respPrediction;

        } catch (error) {
            console.log("Error uploading file: ", error);
            setIdentify();
            setKeyValueTokenGroup();
            setFirstLinesTokenGroup();
            setIdentifyErr({
                header: "Text identification data error - No valid data",
                type: "error",
                content: "This function only works for PDF files.",
                id: "message_error"
            });

            console.log("Returning null due to error.");
            return null;
        }
    }

    async function onInterpret(fullText) {
        try {
            console.log("onInterpret function started.");
            console.log("Full text received for interpretation: ", fullText);

            var respPredictions = await Predictions.interpret({
                text: {
                    source: {
                        text: fullText,
                    },
                    type: "ALL"
                }
            });

            console.log("Interpretation response: ", respPredictions);
            setInterpret(respPredictions);
        } catch (e) {
            console.log("Error during interpretation: ", e);
        }
    }

    function retrieveItems() {
        if (!interpret || !interpret.textInterpretation || !interpret.textInterpretation.textEntities) {
            console.error("Interpret object or textEntities is undefined", interpret);
            return [];
        }

        var textEntitiesArray = [];
        var aMap = {};

        interpret.textInterpretation.textEntities.forEach((each) => {
            aMap[each.type] ??= [];
            aMap[each.type].push(each.text);
        });

        for (let key in aMap) {
            textEntitiesArray.push({
                'type': key,
                'text': aMap[key].join(', '),
            });
        }

        return textEntitiesArray;
    }


    return (
        <Container>
            <SpaceBetween size="l">

                <ProgressBar
                    value={progress}
                    label={filename === undefined ? "Click in the button to upload a file" : "Uploading file " + filename}
                />

                <div>
                    <input accept="*/*" id="icon-button-file" type="file" ref={props.inputRef} onChange={onChange}
                           style={{display: "none"}}/>

                    <Button>
                        <label htmlFor="icon-button-file">
                            Upload new file
                        </label>
                    </Button>

                    {/*<Button onClick={() => {*/}
                    {/*    console.log(identify)*/}
                    {/*}}>*/}
                    {/*    Identify*/}
                    {/*</Button>*/}

                    {/*<Button onClick={() => {*/}
                    {/*    console.log(interpret)*/}
                    {/*}}>*/}
                    {/*    Interpret*/}
                    {/*</Button>*/}

                    {/*<Button onClick={() => {*/}
                    {/*    retrieveItems()*/}
                    {/*}}>*/}
                    {/*    retrieveItems*/}
                    {/*</Button>*/}



                </div>

                {
                    identify == null || identify === undefined ?
                        <></> :
                        <ExpandableSection headerText="Identify text (available only for documents)">
                            <Form>
                                <Grid gridDefinition={
                                    [{colspan: 2}, {colspan: 2}, {colspan: 2}, {colspan: 2}, {colspan: 2}, {colspan: 12}, {colspan: 12}, {colspan: 12}, {colspan: 12}, {colspan: 12}, {colspan: 12}, {colspan: 12}, {colspan: 12}]
                                }>

                                    <FormField label="Key values">
                                        <Input
                                            disabled
                                            value={identify?.text?.keyValues?.length ?? ""}
                                        />
                                    </FormField>
                                    <FormField label="Lines">
                                        <Input
                                            disabled
                                            value={identify == undefined ? "" : identify.text.lines.length}
                                        />
                                    </FormField>
                                    <FormField label="Selections">
                                        <Input
                                            disabled
                                            value={(identify == undefined || identify.text.selections == undefined) ? "" : identify.text.selections.length}
                                        />
                                    </FormField>
                                    <FormField label="Tables">
                                        <Input
                                            disabled
                                            value={(identify == undefined || identify.text.tables == undefined) ? "" : identify.text.tables.length}
                                        />
                                    </FormField>
                                    <FormField label="Words">
                                        <Input
                                            disabled
                                            value={identify == undefined ? "" : identify.text.words.length}
                                        />
                                    </FormField>

                                    <Header variant="h5">
                                        Key Values found
                                    </Header>
                                    <TokenGroup
                                        items={keyValueTokenGroup}
                                    />

                                    <Header variant="h5">
                                        First lines found
                                    </Header>
                                    <TokenGroup
                                        items={firstLinesTokenGroup}
                                    />

                                    {
                                        interpret == null || interpret === undefined ?
                                            <></> :
                                            <>
                                                <Header variant="h5">
                                                    Sentiment
                                                </Header>
                                                <PieChart
                                                    data={[
                                                        {
                                                            title: "Mixed",
                                                            value: interpret.textInterpretation.sentiment.mixed.toFixed(3) * 100,
                                                        },
                                                        {
                                                            title: "Negative",
                                                            value: interpret.textInterpretation.sentiment.negative.toFixed(3) * 100,
                                                        },
                                                        {
                                                            title: "Neutral",
                                                            value: interpret.textInterpretation.sentiment.neutral.toFixed(3) * 100,
                                                        },
                                                        {
                                                            title: "Positive",
                                                            value: interpret.textInterpretation.sentiment.positive.toFixed(3) * 100,
                                                        }
                                                    ]}
                                                    hideFilter
                                                    detailPopoverContent={(datum, sum) => [
                                                        {key: "Value", value: datum.value},
                                                        {
                                                            key: "Percentage",
                                                            value: datum.value.toFixed(2) + " %"
                                                        },
                                                    ]}
                                                />

                                                <Table
                                                    columnDefinitions={[
                                                        {
                                                            id: "type",
                                                            header: "Type",
                                                            cell: item => item.type || "-",
                                                        },
                                                        {
                                                            id: "text",
                                                            header: "Labels found",
                                                            cell: item => item.text || "-",
                                                        },
                                                    ]}
                                                    items={retrieveItems()}
                                                    loadingText="Loading resources"
                                                    sortingDisabled
                                                    variant="embedded"
                                                />
                                            </>
                                    }

                                </Grid>
                            </Form>
                        </ExpandableSection>
                }

            </SpaceBetween>
        </Container>
    );

}

export default UploadFileCard;