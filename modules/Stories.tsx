"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { getBase64 } from "@/utils/file";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import clsx from "clsx";
import { isBefore } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface Story {
  id: string;
  src: string;
  createdAt: string;
  expiresAt: string;
  isViewed: boolean;
}

function Stories() {
  const [listOfStories, setListOfStories] = useState<Story[]>([]);
  const [rearrangeStories, setRearrangeStories] = useState<Story[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [api, setApi] = useState<CarouselApi>();
  const [indexInProgressStory, setIndexInProgressStory] = useState<
    number | undefined
  >(undefined);

  const addNewStory = () => {
    inputRef.current?.click();
  };

  const onImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const img = event.target.files[0];
      const base64 = await getBase64(img);

      const stories = localStorage.getItem("stories");
      localStorage.setItem(
        "stories",
        JSON.stringify(
          [
            ...(stories ? JSON.parse(stories) : []),
            {
              id: uuidv4(),
              src: base64,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(
                new Date().getTime() + 1000 * 60 * 60 * 24
              ).toISOString(),
              isViewed: false,
            } as Story,
          ].sort((story1, story2) => {
            if (story1.isViewed && !story2.isViewed) {
              return 1;
            } else if (!story1.isViewed && story2.isViewed) {
              return -1;
            } else {
              return 0;
            }
          })
        )
      );

      // Dispatch custom event to notify about localStorage change
      window.dispatchEvent(new Event("localStorageChange"));

      event.target.value = "";
    }
  };

  const handleSelectStory = (storyId: string) => {
    const selectedStory = listOfStories.find((story) => story.id === storyId);
    let firstStory = selectedStory;
    if (!selectedStory) return;

    if (!isBefore(new Date(), new Date(selectedStory.expiresAt)))
      firstStory = {
        id: uuidv4(),
        src: "",
        createdAt: "",
        expiresAt: "",
        isViewed: false,
      };
    const remainingStories = listOfStories.filter(
      (story) =>
        story.id !== storyId && isBefore(new Date(), new Date(story.expiresAt))
    );

    setRearrangeStories(
      () => [firstStory, ...remainingStories].filter(Boolean) as Story[]
    );
    setOpen(true);
  };

  const handleExitViewStory = () => {
    setOpen(false);
    setRearrangeStories([]);
    setIndexInProgressStory(undefined);
  };

  useEffect(() => {
    const stories = localStorage.getItem("stories");
    setListOfStories(stories ? JSON.parse(stories) : []);

    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "stories") {
        const newStories = e.newValue ? JSON.parse(e.newValue) : [];
        setListOfStories(newStories);
      }
    };

    // Listen for custom events (for same-tab changes)
    const handleCustomStorageChange = () => {
      const stories = localStorage.getItem("stories");
      setListOfStories(stories ? JSON.parse(stories) : []);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageChange",
        handleCustomStorageChange
      );
    };
  }, []);

  useEffect(() => {
    if (!api) {
      return;
    }

    setIndexInProgressStory(api.selectedScrollSnap());

    api.on("select", () => {
      setIndexInProgressStory(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (indexInProgressStory === rearrangeStories.length - 1)
        handleExitViewStory();
      else api?.scrollNext();
    }, 3000);

    if (indexInProgressStory !== undefined) {
      const selectedStory = rearrangeStories[indexInProgressStory];
      localStorage.setItem(
        "stories",
        JSON.stringify(
          listOfStories
            .filter((story) => isBefore(new Date(), new Date(story.expiresAt)))
            .map((story) =>
              story.id === selectedStory.id
                ? { ...story, isViewed: true }
                : story
            )
            .sort((story1, story2) => {
              if (
                isBefore(new Date(story2.createdAt), new Date(story1.createdAt))
              ) {
                return 1;
              } else if (
                isBefore(new Date(story1.createdAt), new Date(story2.createdAt))
              ) {
                return -1;
              } else {
                return 0;
              }
            })
            .sort((story1, story2) => {
              if (story1.isViewed && !story2.isViewed) {
                return 1;
              } else if (!story1.isViewed && story2.isViewed) {
                return -1;
              } else {
                return 0;
              }
            })
        )
      );
      window.dispatchEvent(new Event("localStorageChange"));
    }

    // Cleanup function to clear the timeout if the component unmounts
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexInProgressStory]);

  return (
    <div className="min-h-screen p-8 gap-16 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[12px] items-center">
        <div className="flex gap-2 items-center w-full md:w-2xl border border-gray-300 rounded-md p-4 overflow-auto no-scrollbar">
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="file"
              className="border border-gray-300 rounded-md p-2 hidden"
              onChange={onImageChange}
              accept="image/*"
            />
            <button
              onClick={addNewStory}
              className="flex items-center justify-center cursor-pointer text-gray-400 hover:text-gray-500 border-2 border-gray-400 rounded-full hover:border-gray-500 w-12 h-12 box-border"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>
          {listOfStories.map((story) => (
            <div
              key={story.id}
              className={clsx(
                "flex aspect-square items-center justify-center min-w-12 h-12 rounded-full border-2 box-border cursor-pointer bg-foreground overflow-hidden",
                story.isViewed ? "border-gray-300" : "border-blue-400"
              )}
              onClick={() => {
                handleSelectStory(story.id);
              }}
            >
              <div
                className="w-full h-full flex items-center justify-center bg-cover bg-center bg-no-repeat bg-foreground"
                style={{
                  backgroundImage: `url(${story.src || ""})`,
                }}
              />
            </div>
          ))}
        </div>

        <div>
          <Dialog
            open={open}
            onClose={handleExitViewStory}
            className="relative z-10"
          >
            <DialogBackdrop
              transition
              className="fixed inset-0 bg-background transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
            />
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full justify-center text-center items-center sm:p-0">
                <DialogPanel
                  transition
                  className="relative transform overflow-hidden text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in data-closed:sm:translate-y-0 data-closed:sm:scale-95 h-dvh aspect-[1080/1920] flex items-center"
                >
                  <div className="absolute z-10 w-full top-0 flex gap-2 py-4">
                    {rearrangeStories.length > 0 &&
                      rearrangeStories.map((_, index) => (
                        <div
                          key={index}
                          className={`w-auto h-1 flex-1 ${
                            index >= Number(indexInProgressStory)
                              ? "bg-white/50"
                              : "bg-white"
                          }`}
                        >
                          <div
                            className={`w-0 h-full bg-white ${
                              indexInProgressStory === index ? "scaleWidth" : ""
                            }`}
                          />
                        </div>
                      ))}
                  </div>

                  <Carousel
                    setApi={setApi}
                    opts={{ slidesToScroll: 1 }}
                    className="w-full bg-background"
                  >
                    <CarouselContent>
                      {rearrangeStories.map((story, index) => (
                        <CarouselItem key={index}>
                          <div className="flex aspect-[1080/1920] items-center justify-center">
                            <div
                              key={index}
                              className="w-full h-full flex items-center justify-center bg-cover bg-center bg-no-repeat bg-foreground text-background font-semibold"
                              style={{
                                backgroundImage: `url(${story.src || ""})`,
                              }}
                            >
                              {!story.src && "This story is expired"}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </DialogPanel>
              </div>
            </div>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

export default Stories;
