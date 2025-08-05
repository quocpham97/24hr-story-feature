"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { getBase64 } from "@/utils/file";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { isBefore } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface Story {
  id: string;
  src: string;
  createdAt: string;
  expiresAt: string;
}

function Stories() {
  const [listOfStories, setListOfStories] = useState<Story[]>([]);
  const [rearrangeStories, setRearrangeStories] = useState<Story[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [api, setApi] = useState<CarouselApi>();
  const [currentStory, setCurrentStory] = useState<number | undefined>(
    undefined
  );

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
        JSON.stringify([
          ...(stories
            ? JSON.parse(stories).filter((story: Story) =>
                isBefore(new Date(), new Date(story.expiresAt))
              )
            : []),
          {
            id: uuidv4(),
            src: base64,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(
              new Date().getTime() + 1000 * 60 * 60 * 24
            ).toISOString(),
          },
        ])
      );

      // Dispatch custom event to notify about localStorage change
      window.dispatchEvent(new Event("localStorageChange"));
    }
  };

  const handleSelectStory = (storyId: string) => {
    const story = listOfStories.find((story) => story.id === storyId);
    let firstStory = story;
    if (!story) return;

    if (!isBefore(new Date(), new Date(story.expiresAt)))
      firstStory = {
        id: uuidv4(),
        src: "",
        createdAt: "",
        expiresAt: "",
      };
    const remainingStories = listOfStories.filter(
      (story) =>
        story.id !== storyId && isBefore(new Date(), new Date(story.expiresAt))
    );

    setRearrangeStories(
      () => [firstStory, ...remainingStories].filter(Boolean) as Story[]
    );
    setOpen(true);

    localStorage.setItem(
      "stories",
      JSON.stringify([
        ...listOfStories.filter((story) =>
          isBefore(new Date(), new Date(story.expiresAt))
        ),
      ])
    );
    window.dispatchEvent(new Event("localStorageChange"));
  };

  const handleExitViewStory = () => {
    setOpen(false);
    setRearrangeStories([]);
    setCurrentStory(undefined);
  };

  useEffect(() => {
    const stories = localStorage.getItem("stories");
    setListOfStories(
      stories
        ? JSON.parse(stories).filter((story: Story) =>
            isBefore(new Date(), new Date(story.expiresAt))
          )
        : []
    );

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

    setCurrentStory(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrentStory(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStory === rearrangeStories.length - 1) handleExitViewStory();
      else api?.scrollNext();
    }, 3000);

    // Cleanup function to clear the timeout if the component unmounts
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory]);

  return (
    <div className="min-h-screen p-8 gap-16 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[12px] items-center">
        <div className="flex gap-2 items-center w-full md:w-2xl border border-gray-300 rounded-md p-4 overflow-hidden">
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
              className="flex items-center justify-center cursor-pointer text-gray-400 hover:text-gray-500 border border-gray-400 rounded-full hover:border-gray-500 w-10 h-10 box-border"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
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
              className="flex aspect-square items-center justify-center w-10 h-10 rounded-full border border-gray-300 box-border cursor-pointer bg-foreground overflow-hidden"
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
                  className="relative transform overflow-hidden text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in w-full max-w-md data-closed:sm:translate-y-0 data-closed:sm:scale-95 aspect-[1080/1920]"
                >
                  <div className="fixed top-0 w-full max-w-md flex gap-2 py-4">
                    {rearrangeStories.length > 0 &&
                      rearrangeStories.map((_, index) => (
                        <div
                          key={index}
                          className={`w-auto h-1 flex-1 ${
                            index >= Number(currentStory)
                              ? "bg-foreground/50"
                              : "bg-foreground"
                          }`}
                        >
                          <div
                            className={`w-0 h-full bg-foreground ${
                              currentStory === index ? "scaleWidth" : ""
                            }`}
                          />
                        </div>
                      ))}
                  </div>

                  <Carousel
                    setApi={setApi}
                    opts={{ slidesToScroll: 1 }}
                    className="w-full max-w-md bg-background"
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
