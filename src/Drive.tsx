import React, { useEffect, useState } from "react";
import {
  ShdwDrive,
  StorageAccountResponse,
  ShadowDriveVersion,
} from "@shadow-drive/sdk";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import {
  CircularProgress,
  TextField,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Button,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  styled,
  LinearProgress,
  Container,
  Grid,
  Divider,
} from "@mui/material";

const bytesToHuman = (bytes: any, si = false, dp = 1) => {
  const thresh = si ? 1024 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
};
/**
 *
 * Simple usage examples for Shadow Drive
 *
 * @returns
 *
 */
export default function Drive() {
  const { connection } = useConnection();
  const [drive, setDrive] = useState<ShdwDrive>();
  const wallet = useWallet();
  const [acc, setAcc] = useState<StorageAccountResponse>();
  const [accs, setAccs] = useState<Array<StorageAccountResponse>>([]);
  const [fileList, setFileList] = useState<any>();
  const [displayFiles, setDisplayFiles] = useState<any>();
  const [radioValue, setRadioValue] = useState<PublicKey | String>();
  const [uploadLocs, setUploadLocs] = useState<any>();
  const [accName, setAccName] = useState<string>("");
  const [accSize, setAccSize] = useState<string>("1GB");
  const [loading, setLoading] = useState<boolean>();
  const [tx, setTx] = useState<String>();
  const [version, setVersion] = useState<ShadowDriveVersion>("v2");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const submitForm = async () => {
    if (!acc?.publicKey || !fileList) return;

    const data = {
      name: "John doe",
      bio: "What's up there?",
      avatar: "",
      username: "jondoe",
    };

    // Construct the file to upload
    let f = new File([JSON.stringify(data)], "example.json", {
      type: "application/json",
    });

    try {
      const uploadResponse = await drive?.uploadFile(acc?.publicKey!, f);
      console.log(uploadResponse);
      await setUploadLocs(uploadResponse);
    } catch (e) {
      console.log(e);
    }
    await renderFiles();
  };

  const listFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const displayFiles = [];
      for (const file of e.target.files) {
        const tmpdisplay = {
          name: file.name,
          location: "",
        };
        displayFiles.push(tmpdisplay);
      }
      setDisplayFiles(displayFiles);
      setFileList(e.target.files);
    }
  };

  const renderFiles = () => {
    let index = 1;
    let elements = [];
    for (const file of displayFiles) {
      let uploadLoc;
      if (uploadLocs) {
        uploadLoc = uploadLocs.findIndex(
          (upload: any) => upload.fileName === file.name
        );
        file.location = uploadLocs[uploadLoc].location;
      }
      //@ts-ignore
      elements.push(
        <div key={index} style={{ margin: "10px" }}>
          <p>
            File {`${index}`}: {file.name}
          </p>
          <p>
            Upload Location:{" "}
            {file.location ? (
              <a href={file.location}>{file.location}</a>
            ) : (
              <CircularProgress size={20} />
            )}
          </p>
        </div>
      );
      index++;
    }
    return elements;
  };

  const createAccount = async () => {
    if (!accName || !accSize || !version) return;
    try {
      setLoading(true);
      const result = await drive?.createStorageAccount(
        accName,
        accSize,
        version
      );
      setTx(result!.transaction_signature);
    } catch (e) {
      console.log(e);
    }
    refreshAccounts();
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const drive = await new ShdwDrive(connection, wallet).init();
        await setDrive(drive);
      }
    })();
  }, [wallet.connected]);

  const refreshAccounts = async () => {
    const accounts = await drive?.getStorageAccounts("v2");
    setAccs(accounts!);
  };

  const handleDelete = async (fileUrl: string) => {
    if (!drive || !acc) {
      return;
    }
    const delFile = await drive.deleteFile(acc.publicKey, fileUrl, "v2");
    getFiles();
    console.log(delFile);
  };

  useEffect(() => {
    if (drive) {
      refreshAccounts();
    }
  }, [drive]);

  useEffect(() => {
    console.log("uploaded");
    if (displayFiles) {
      console.log(uploadLocs);
      renderFiles();
    }
  }, [uploadLocs]);

  async function getFiles() {
    const listObjects = await drive?.listObjects(acc?.publicKey!);
    const files =
      listObjects?.keys.map((fileName) => {
        let url = `https://shdw-drive.genesysgo.net/${acc?.publicKey}/${fileName}`;
        return new URL(url).toString();
      }) ?? [];

    setUploadedFiles(files);
  }

  useEffect(() => {
    if (acc) {
      getFiles();
    }
  }, [acc, drive]);

  return (
    <Container>
      <Grid container>
        <Grid item xs={12} justifyContent="center">
          <h1 style={{ marginBottom: "20px", textAlign: "center" }}>
            Shadow Drive Example App
          </h1>
          <div style={{ textAlign: "center" }}>
            <WalletMultiButton />
          </div>
        </Grid>
      </Grid>

      <Grid container>
        <Grid item xs={6}>
          <div style={{ marginTop: "50px", maxWidth: "500px" }}>
            <h2 style={{ marginBottom: "20px" }}>
              Create a Shadow Drive account:
            </h2>
            <form>
              <TextField
                color="secondary"
                type="text"
                name="storageAccount"
                label="Storage Name"
                variant="standard"
                focused
                sx={{
                  input: {
                    color: "white",
                  },
                }}
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
              ></TextField>
              <FormControl sx={{ marginLeft: "20px", width: "100px" }} focused>
                <InputLabel id="size-select" color="secondary">
                  Size
                </InputLabel>
                <Select
                  variant="standard"
                  color="secondary"
                  labelId="size-select"
                  id="size-select-el"
                  value={accSize}
                  label="Age"
                  sx={{
                    color: "white",
                  }}
                  onChange={(e) => {
                    setAccSize(e.target.value);
                  }}
                >
                  <MenuItem value={"1GB"}>1GB</MenuItem>
                  <MenuItem value={"10GB"}>10GB</MenuItem>
                  <MenuItem value={"50GB"}>50GB</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ marginLeft: "20px", width: "100px" }} focused>
                <InputLabel id="version-select" color="secondary">
                  Version
                </InputLabel>
                <Select
                  variant="standard"
                  color="secondary"
                  labelId="version-select"
                  id="version-select-el"
                  value={version}
                  label="version"
                  sx={{
                    color: "white",
                  }}
                  onChange={(e) => {
                    setVersion(e.target.value as ShadowDriveVersion);
                  }}
                >
                  <MenuItem value={"v1"}>v1</MenuItem>
                  <MenuItem value={"v2"}>v2</MenuItem>
                </Select>
              </FormControl>
            </form>
            <div style={{ marginTop: "20px" }}>
              <Button
                sx={{ marginLeft: "20px" }}
                color="secondary"
                variant="contained"
                onClick={createAccount}
              >
                Create
              </Button>
            </div>
            {loading ? (
              <div>
                <h5>Submitting on chain</h5>
                <LinearProgress
                  sx={{ marginBottom: "20px" }}
                  color="success"
                ></LinearProgress>
              </div>
            ) : (
              ""
            )}
            {tx ? (
              <div>
                Account Created:{" "}
                <a href={`https://explorer.solana.com/tx/${tx}?cluster=custom`}>
                  {tx.slice(0, 8)}
                </a>
              </div>
            ) : (
              ""
            )}
          </div>
        </Grid>
        <Grid item xs={6}>
          <div style={{ marginTop: "50px" }}>
            <h2 style={{ marginBottom: "10px" }}>
              Select a Shadow Drive account:
            </h2>
            <FormControl>
              <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                value={radioValue}
                onChange={(e) => {
                  setRadioValue(e.target.value);
                }}
              >
                {accs.map((acc, index) => {
                  return (
                    <FormControlLabel
                      key={index}
                      value={acc.publicKey}
                      control={<Radio />}
                      checked={radioValue == acc.publicKey}
                      label={
                        acc.account.identifier +
                        " - " +
                        bytesToHuman(
                          new anchor.BN(acc.account.storage).toNumber()
                        ) +
                        " drive"
                      }
                      onClick={(e) => {
                        setAcc(acc);
                      }}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>
          </div>
          <form style={{ marginTop: "50px" }}>
            <Button color="secondary" variant="contained" component="label">
              <input
                type={"file"}
                multiple
                onChange={(e) => {
                  listFiles(e);
                }}
                hidden
              ></input>
              Select Files
            </Button>
          </form>
          {displayFiles?.length ? renderFiles() : ""}
          {displayFiles ? (
            <Button
              color="secondary"
              variant="contained"
              style={{ marginTop: "30px" }}
              onClick={submitForm}
            >
              Submit
            </Button>
          ) : (
            ""
          )}

          <div style={{ marginTop: "50px" }}>
            <h2 style={{ marginBottom: "10px" }}>
              List of all uploaded files under selected account:
            </h2>
            <ul>
              {uploadedFiles.length > 0
                ? uploadedFiles.map((fileUrl, index) => (
                    <li key={index}>
                      <a style={{ color: "white" }} href={fileUrl}>
                        {fileUrl.split("/").slice(-1)}
                      </a>

                      <button onClick={() => handleDelete(fileUrl)}>
                        Delete
                      </button>
                    </li>
                  ))
                : null}
            </ul>
          </div>
        </Grid>
      </Grid>
    </Container>
  );
}
